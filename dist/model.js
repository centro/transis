"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _pluralize = require("pluralize");

var _pluralize2 = _interopRequireDefault(_pluralize);

var _id_map = require("./id_map");

var _id_map2 = _interopRequireDefault(_id_map);

var _object = require("./object");

var _object2 = _interopRequireDefault(_object);

var _array = require("./array");

var _array2 = _interopRequireDefault(_array);

var _validations = require("./validations");

var _validations2 = _interopRequireDefault(_validations);

var _attrs = require("./attrs");

var attrs = _interopRequireWildcard(_attrs);

var _util = require("./util");

var util = _interopRequireWildcard(_util);

var registeredAttrs = {},
    subclasses = {},
    loads = [];

var NEW = "new";
var EMPTY = "empty";
var LOADED = "loaded";
var DELETED = "deleted";

// Internal: Returns the `Basis.Model` subclass with the given name.
//
// name  - A string representing the name of a `Basis.Model` subclass.
// raise - A boolean indicating whether an exception should be raised if the name can't be
//         resolved (default: `true`).
//
// Returns the resolved subclass constructor function or `undefined` if a class with the given
//   name is not known.
// Throws `Error` if the `raise` argument is `true` and the name cannot not be resolved.
function resolve(name) {
  var raise = arguments[1] === undefined ? true : arguments[1];

  var klass = typeof name === "function" ? name : subclasses[name];

  if (!klass && raise) {
    throw new Error("Basis.Model.resolve: could not resolve subclass: `" + name + "`");
  }

  return klass;
};

// Internal: Checks to make sure the given object is of the type specified in the given
// association descriptor.
//
// Returns nothing.
// Throws `Error` if the given object isn't of the type specified in the association descriptor.
function checkAssociatedType(desc, o) {
  var klass = resolve(desc.klass);

  if (o && !(o instanceof klass)) {
    throw new Error("" + desc.debugName + ": expected an object of type `" + desc.klass + "` but received `" + o + "` instead");
  }
}

// Internal: The overridden `_splice` method used on `hasMany` arrays. This method syncs changes to
// the array to the inverse side of the association and maintains a list of changes made.
function hasManySplice(i, n, added) {
  var owner = this.__owner__,
      desc = this.__desc__,
      inverse = desc.inverse,
      name = desc.name,
      removed,
      changes,
      i;

  added.forEach(function (o) {
    return checkAssociatedType(desc, o);
  });

  removed = _array2["default"].prototype._splice.call(this, i, n, added);

  if (inverse && !this.__handlingInverse__) {
    removed.forEach(function (model) {
      model._inverseRemoved(inverse, owner);
    }, this);
    added.forEach(function (model) {
      model._inverseAdded(inverse, owner);
    }, this);
  }

  if (desc.owner && !loads.length) {
    changes = owner.changes[name] = owner.changes[name] || { added: [], removed: [] };

    removed.forEach(function (m) {
      if ((i = changes.added.indexOf(m)) !== -1) {
        changes.added.splice(i, 1);
      } else if (changes.removed.indexOf(m) === -1) {
        changes.removed.push(m);
      }
    });

    added.forEach(function (m) {
      if ((i = changes.removed.indexOf(m)) !== -1) {
        changes.removed.splice(i, 1);
      } else if (changes.added.indexOf(m) === -1) {
        changes.added.push(m);
      }
    });

    if (!changes.added.length && !changes.removed.length) {
      owner._clearChange(name);
    } else {
      owner._setChange(name, changes);
    }
  }

  return removed;
}

// Internal: Called when a model is added to the inverse side of a `hasMany` association in order to
// sync the change to the `hasMany` side.
function hasManyInverseAdd(model) {
  this.__handlingInverse__ = true;
  this.push(model);
  this.__handlingInverse__ = false;
}

// Internal: Called when a model is removed from the inverse side of a `hasMany` association in
// order to sync the change to the `hasMany` side.
function hasManyInverseRemove(model) {
  var i = this.indexOf(model);

  if (i >= 0) {
    this.__handlingInverse__ = true;
    this.splice(i, 1);
    this.__handlingInverse__ = false;
  }
}

// Internal: Builds an array that manages a `hasMany` association. A hasMany array is a
// `Basis.Array` that overrides the `_splice` method in order to handle syncing the inverse side
// of the association.
function hasManyArray(owner, desc) {
  var a = _array2["default"].of();
  a.proxy(owner, desc.name);
  a.__owner__ = owner;
  a.__desc__ = desc;
  a._splice = hasManySplice;
  a._inverseAdd = hasManyInverseAdd;
  a._inverseRemove = hasManyInverseRemove;
  return a;
}

// Internal: Sets the given object on a `hasOne` property.
//
// desc - An association descriptor.
// v    - The value to set.
// sync - Set to true to notify the inverse side of the association so that it can update itself.
//
// Returns nothing.
// Throws `Error` if the given object isn't of the type specified in the association descriptor.
function hasOneSet(desc, v, sync) {
  var name = desc.name,
      k = "__" + name,
      prev = this[k],
      inv = desc.inverse;

  checkAssociatedType(desc, v);

  this[k] = v;

  if (sync && inv && prev) {
    prev._inverseRemoved(inv, this);
  }
  if (sync && inv && v) {
    v._inverseAdded(inv, this);
  }

  if (prev) {
    prev._deregisterProxy(this, name);
  }
  if (v) {
    v._registerProxy(this, name);
  }
}

// Internal: Callback for a successful model deletion. Updates the model's state, removes it from
// the identity map, and removes removes it from any associations its currently participating in.
function mapperDeleteSuccess() {
  var _this = this;

  _id_map2["default"]["delete"](this);
  this.isBusy = false;
  this.sourceState = DELETED;
  this._clearErrors();

  var _loop = function (_name) {
    var desc = _this.associations[_name];
    if (!desc.inverse) {
      return "continue";
    }
    if (desc.type === "hasOne") {
      var m = undefined;
      if (m = _this[_name]) {
        m._inverseRemoved(desc.inverse, _this);
      }
    } else if (desc.type === "hasMany") {
      _this[_name].slice(0).forEach(function (m) {
        m._inverseRemoved(desc.inverse, _this);
      });
    }
  };

  for (var _name in this.associations) {
    var _ret = _loop(_name);

    if (_ret === "continue") continue;
  }
}

var Model = _object2["default"].extend(function () {
  this.displayName = "Basis.Model";

  // Public: Creates a subclass of `Basis.Model`. This method overrides the `Basis.Object.extend`
  // method in order to force `Model` subclasses to be named.
  this.extend = function (name, f) {
    if (typeof name !== "string") {
      throw new Error("" + this + ".extend: a name is required");
    }

    var subclass = _object2["default"].extend.call(this);
    subclass.displayName = name;
    subclasses[name] = subclass;

    if (typeof f === "function") {
      f.call(subclass);
    }

    return subclass;
  };

  // Public: Returns an empty instance of the model class. An empty instance contains only an id
  // and must be retrieved from the mapper before any of its attributes will be available. Since the
  // model's data mapper will likely need to perform an async action to retrieve data, this method
  // is used to construct an object that is suitable for returning from `Model.get` immediately.
  // Once the data mapper has finished loading the actual model data, the empty model will have its
  // attributes filled in.
  //
  // id - The id of the model.
  //
  // Returns a new instance of the class.
  this.empty = function (id) {
    var model = new this({ id: id });
    model.sourceState = EMPTY;
    return model;
  };

  // Public: Registers a new attribute type available to be used on `Model` subclasses.
  //
  // name      - A string representing the name of the attribute type.
  // converter - A converter object or constructor function. Converter objects must implement two
  //             methods: `coerce` and `serialize`. The `coerce` method should take the given value
  //             and do its best to convert it to attribute's actual type. The `serialize` method
  //             should take the coerced value and return something suitable for JSON serialization.
  //             If a constructor function is given here, it will be instantiated once for each
  //             declared attribute of this type and will be passed the options object given to the
  //             `.attr` method.
  //
  // Returns the receiver.
  this.registerAttr = function (name, converter) {
    if (registeredAttrs[name]) {
      throw new Error("" + this + ".registerAttr: an attribute with the name `" + name + "` has already been defined");
    }

    registeredAttrs[name] = converter;

    return this;
  };

  this.registerAttr("identity", attrs.IdentityAttr);
  this.registerAttr("string", attrs.StringAttr);
  this.registerAttr("integer", attrs.IntegerAttr);
  this.registerAttr("number", attrs.NumberAttr);
  this.registerAttr("boolean", attrs.BooleanAttr);
  this.registerAttr("date", attrs.DateAttr);
  this.registerAttr("datetime", attrs.DateTimeAttr);

  // Public: Defines an attribute on the model class. Attributes are typed properties that can
  // parse/coerce raw values (say from a JSON object) into objects of the property type. Calling
  // this method will define a property on the class's `prototype` so that it is available to all
  // instances.
  //
  // Attribute values are automatically coerced to their proper type when set. The original value is
  // available in the property named "<name>BeforeCoercion".
  //
  // name - A string representing the name of the attribute.
  // type - A string representing the type of the attribute (this must have been previously
  //        registered with `Model.registerAttr`).
  // opts - An object containing properties to pass to the attribute's converter object (default:
  //        `{}`).
  //
  // Returns the receiver.
  this.attr = function (name, type) {
    var opts = arguments[2] === undefined ? {} : arguments[2];

    var converter = registeredAttrs[type];

    if (!converter) {
      throw new Error("" + this + ".attr: unknown attribute type: `" + type + "`");
    }

    if (typeof converter === "function") {
      converter = new converter(opts);
    }

    this.prop(name, {
      attr: true,
      converter: converter,
      get: function get() {
        return this["__" + name];
      },
      set: function set(v) {
        this["__" + name] = converter.coerce(v);
        this["" + name + "BeforeCoercion"] = v;
      },
      "default": "default" in opts ? opts["default"] : undefined
    });

    return this;
  };

  // Public: Defines a `hasOne` association on the receiver class. This method will generate a
  // property with the given name that can be used to get or set the associated model.
  //
  // name  - A string representing the name of the association.
  // klass - Either the constructor function of the associated model or a string containing the name
  //         of the associated constructor function. Passing a string here is useful for the case
  //         where you are defining an association where the associated constructor function has yet
  //         to be defined.
  // opts  - An object containing zero or more of the following keys (default: `{}`):
  //   inverse - Used for establishing two way associations, this is the name of the property on the
  //             associated object that points back to the receiver class.
  //
  // Returns the receiver.
  this.hasOne = function (name, klass) {
    var opts = arguments[2] === undefined ? {} : arguments[2];

    var desc;

    if (!this.prototype.hasOwnProperty("associations")) {
      this.prototype.associations = Object.create(this.prototype.associations);
    }

    this.prototype.associations[name] = desc = Object.assign({}, opts, {
      type: "hasOne", name: name, klass: klass, debugName: "" + this.toString() + "#" + name
    });

    if (desc.owner) {
      if (!this.prototype.hasOwnProperty("__deps__")) {
        this.prototype.__deps__ = Object.create(this.prototype.__deps__);
      }

      (this.prototype.__deps__["" + name + ".hasErrors"] = this.prototype.__deps__["" + name + ".hasErrors"] || []).push("hasErrors");
      (this.prototype.__deps__["" + name + ".hasChanges"] = this.prototype.__deps__["" + name + ".hasChanges"] || []).push("hasChanges");
    }

    this.prop(name, {
      get: function get() {
        return this["__" + name];
      },
      set: function set(v) {
        hasOneSet.call(this, desc, v, true);
      }
    });

    return this;
  };

  // Public: Defines a `hasMany` association on the receiver class. This method will generate a
  // property with the given name that can be used to get or set an array of associated model
  // objects. It will also generate methods that can be used to manipulate the array. A `hasMany`
  // association with the name `widgets` would generate the following methods:
  //
  // addWidgets    - Adds one or more `Widget` models to the association array.
  // removeWidgets - Removes one ore more `Widget` models from the association array.
  // clearWidgets  - Empties the association array.
  //
  // Its important to use these generated methods to manipulate the array instead of manipulating it
  // directly since they take care of syncing changes to the inverse side of the association when
  // the association is two way.
  //
  // name  - A string representing the name of the association.
  // klass - Either the constructor function of the associated model or a string containing the name
  //         of the associated constructor function. Passing a string here is useful for the case
  //         where you are defining an association where the associated constructor function has yet
  //         to be defined.
  // opts  - (see hasOne description)
  //
  // Returns the receiver.
  this.hasMany = function (name, klass) {
    var opts = arguments[2] === undefined ? {} : arguments[2];

    var k = "__" + name,
        desc;

    if (!this.prototype.hasOwnProperty("associations")) {
      this.prototype.associations = Object.create(this.prototype.associations);
    }

    this.prototype.associations[name] = desc = Object.assign({}, opts, {
      type: "hasMany", name: name, klass: klass, singular: (0, _pluralize2["default"])(name, 1), debugName: "" + this.toString() + "#" + name
    });

    if (desc.owner) {
      if (!this.prototype.hasOwnProperty("__deps__")) {
        this.prototype.__deps__ = Object.create(this.prototype.__deps__);
      }

      (this.prototype.__deps__["" + name + ".hasErrors"] = this.prototype.__deps__["" + name + ".hasErrors"] || []).push("hasErrors");
      (this.prototype.__deps__["" + name + ".hasChanges"] = this.prototype.__deps__["" + name + ".hasChanges"] || []).push("hasChanges");
    }

    this.prop(name, {
      get: function get() {
        if (this[k]) {
          return this[k];
        }
        desc.klass = resolve(desc.klass);
        return this[k] = hasManyArray(this, desc);
      },
      set: function set(a) {
        this[k].replace(a);
      }
    });
  };

  // Public: Add a validator for the given attribute. The validator function or method should use
  // the `Model#addError` method to record a validation error when one is detected.
  //
  // name - The name of the property to validate.
  // f    - A validator function or the name of an instance method.
  //
  // Returns the receiver.
  this.validate = function (name, f) {
    if (!this.prototype.hasOwnProperty("validators")) {
      this.prototype.validators = Object.create(this.prototype.validators);
    }

    (this.prototype.validators[name] = this.prototype.validators[name] || []).push(f);

    return this;
  };

  // Public: Loads the given model attributes into the identity map. This method should be called by
  // your data mapper(s) when new data is successfully retrieved.
  //
  // attrs - An object containing the attributes for a single model. If the attributes contain
  //         references to defined associations, those associated objects will be loaded as well.
  //
  // Returns the loaded model instance.
  // Throws `Error` if the given attributes do not contain an `id` attribute.
  this.load = function (attrs) {
    var id = attrs.id,
        associations = this.prototype.associations,
        associated = {},
        model;

    if (!id) {
      throw new Error("" + this + ".load: an `id` attribute is required");
    }

    loads.push(true);

    attrs = Object.assign({}, attrs);
    model = _id_map2["default"].get(this, id) || new this();
    delete attrs.id;

    // extract associated attributes
    for (var _name2 in associations) {
      var desc = associations[_name2];

      if (_name2 in attrs) {
        associated[_name2] = attrs[_name2];
        delete attrs[_name2];
      } else if (desc.type === "hasOne" && "" + _name2 + "Id" in attrs) {
        associated[_name2] = attrs["" + _name2 + "Id"];
        delete attrs["" + _name2 + "Id"];
      } else if (desc.type === "hasOne" && "" + _name2 + "_id" in attrs) {
        associated[_name2] = attrs["" + _name2 + "_id"];
        delete attrs["" + _name2 + "_id"];
      } else if (desc.type === "hasMany" && "" + desc.singular + "Ids" in attrs) {
        associated[_name2] = attrs["" + desc.singular + "Ids"];
        delete attrs["" + desc.singular + "Ids"];
      } else if (desc.type === "hasMany" && "" + desc.singular + "_ids" in attrs) {
        associated[_name2] = attrs["" + desc.singular + "_ids"];
        delete attrs["" + desc.singular + "_ids"];
      }
    }

    // set non-association attributes
    model.set(attrs);

    // set id if necessary
    if (model.id === undefined) {
      model.id = id;
    }

    var _loop2 = function (_name3) {
      var klass = resolve(associations[_name3].klass);
      var data = associated[_name3];

      // clear association
      if (!data) {
        model[_name3] = null;
        return "continue";
      }

      if (associations[_name3].type === "hasOne") {
        var other = typeof data === "object" ? klass.load(data) : klass.local(data);
        model[_name3] = other;
      } else if (associations[_name3].type === "hasMany") {
        (function () {
          var others = [];
          data.forEach(function (o) {
            others.push(typeof o === "object" ? klass.load(o) : klass.local(o));
          });
          model[_name3] = others;
        })();
      }
    };

    // load and set each association
    for (var _name3 in associated) {
      var _ret2 = _loop2(_name3);

      if (_ret2 === "continue") continue;
    }

    model.sourceState = LOADED;
    model._clearChanges();
    model._clearErrors();

    loads.pop();

    return model;
  };

  // Public: Loads an array of attribute objects.
  //
  // objects - An array containing attribute hashes.
  //
  // Returns an array of loaded model instances.
  this.loadAll = function (objects) {
    var _this2 = this;

    return objects.map(function (object) {
      return _this2.load(object);
    });
  };

  // Public: Creates a new query array but does not invoke its `query` method. This is useful for
  // cases where you want to initialize an empty query, but not yet run it.
  //
  // The array returned by this method is decorated with the following additional properties:
  //
  //   modelClass - The `Basis.Model` subclass that `buildQuery` was invoked on.
  //   isBusy     - Boolean property indicating whether a query is in progress.
  //   error      - An error message set on the array when the mapper fails to fulfill its promise.
  //   meta       - Metadata provided by the mapper. May be used for paging results.
  //
  // And with these additional methods:
  //
  //   query: Execute a query by invoking the `query` method on the modelClass's mapper. This will
  //   put the array into a busy state (indicated by the `isBusy` property) until the mapper has
  //   fulfilled its promise. When the promise is successfully resolved, the returned data is loaded
  //   via `Basis.Model.loadAll` and the materialized models are replaced into the array. When the
  //   promise is rejected, the error message returned by the mapper is made available on the `error`
  //   property.
  //
  //   If the this method is called while the array is currently busy, then the call to the mapper
  //   is queued until the current query completes.
  //
  //   opts - An object to pass along to the mapper (default: `{}`).
  //
  //   Returns the receiver.
  //
  //   then: Registers fulfillment and rejection handlers on the latest promise object returned by
  //   the modelClass's mapper. If the `query` method has yet to be called, then the `onFulfilled`
  //   handler is invoked immediately.
  //
  //   When resolved, the `onFulfilled` handler is called with no arguments. When rejected, the
  //   `onFulfilled` handler is called with the error message from the mapper.
  //
  //   onFulfilled - A function to be invoked when the latest promise from the mapper is resolved.
  //   onRejected  - A function to be invoked when the latest promise from the mapper is rejected.
  //
  //   Returns a new `Promise` that will be resolved with the return value of `onFulfilled`.
  //
  //   catch: Registers a rejection handler on the latest promise object returned by the
  //   modelClass's mapper.
  //
  //   onRejected - A function to be invoked when the latest promise from the mapper is rejected.
  //
  //   Returns a new `Promise` that is resolved to the return value of the callback if it is called.
  //
  // Returns a new `Basis.Array` decorated with the properties and methods described above.
  this.buildQuery = function () {
    var modelClass = this,
        promise = Promise.resolve(),
        a = _array2["default"].of(),
        queued;

    a.props({
      modelClass: { get: function get() {
          return modelClass;
        } },
      isBusy: { "default": false },
      error: {},
      meta: {}
    });

    a.query = function () {
      var _this3 = this;

      var opts = arguments[0] === undefined ? {} : arguments[0];

      if (this.isBusy) {
        if (!queued) {
          promise = promise.then(function () {
            _this3.query(queued);
            queued = undefined;
            return promise;
          });
        }

        queued = opts;
      } else {
        this.isBusy = true;
        promise = modelClass._callMapper("query", [opts]).then(function (result) {
          try {
            if (Array.isArray(result)) {
              _this3.replace(modelClass.loadAll(result));
            } else if (result.results) {
              _this3.replace(modelClass.loadAll(result.results));
              _this3.meta = result.meta;
            }
          } catch (e) {
            console.error(e);throw e;
          }
          _this3.isBusy = false;
          _this3.error = undefined;
        }, function (e) {
          _this3.isBusy = false;
          _this3.error = e;
          return Promise.reject(e);
        });
      }

      return this;
    };

    a.then = function (f1, f2) {
      return promise.then(f1, f2);
    };
    a["catch"] = function (f) {
      return promise["catch"](f);
    };

    return a;
  };

  // Public: Creates a new `Basis.QueryArray` and invokes its `query` method with the given options.
  //
  // opts - An options object to pass to the `Basis.QueryArray#query` method (default: `{}`).
  //
  // Returns a new `Basis.QueryArray`.
  this.query = function () {
    var opts = arguments[0] === undefined ? {} : arguments[0];
    return this.buildQuery().query(opts);
  };

  // Public: Retrieves a model from the identity map or creates a new empty model instance. If you
  // want to get the model from the mapper, then use the `Model.get` method.
  //
  // id - The id of the model to get.
  //
  // Returns an instance of the receiver.
  this.local = function (id) {
    return _id_map2["default"].get(this, id) || this.empty(id);
  };

  // Public: Gets a model instance, either from the identity map or from the mapper. If the model
  // has already been loaded into the identity map, then it is simply returned, otherwise the data
  // mapper's `get` method will be invoked and an empty model will be returned.
  //
  // id   - The id of the model to get.
  // opts - An object containing zero or more of the following keys (default: `{}`):
  //   refresh - When true, the mapper's get method will be called regardless of whether the model
  //             exists in the identity map.
  //
  // Returns an instance of the receiver.
  this.get = function (id) {
    var _this4 = this;

    var opts = arguments[1] === undefined ? {} : arguments[1];

    var model = this.local(id),
        getOpts = Object.assign({}, opts);
    delete getOpts.refresh;

    if (model.isEmpty || opts.refresh) {
      model.isBusy = true;
      model.__promise__ = this._callMapper("get", [id, getOpts]).then(function (result) {
        model.isBusy = false;
        try {
          _this4.load(result);
        } catch (e) {
          console.error(e);throw e;
        }
      }, function (errors) {
        model.isBusy = false;
        model._loadErrors(errors);
        return Promise.reject(errors);
      });
    }

    return model;
  };

  // Public: Clears all models from the id map. This will subsequently cause the model layer to go
  // to the mapper for any model that had previously been loaded.
  this.clearIdMap = function () {
    _id_map2["default"].clear();return this;
  };

  // Internal: Invokes the given method on the receiver's mapper, ensuring that it returns a
  // Thennable (Promise-like) object.
  //
  // method - The method to invoke on the mapper.
  // args   - An array of arguments to pass to the mapper method.
  //
  // Returns the promise returned by the mapper.
  // Throws `Error` when the mapper is not defined.
  // Throws `Error` when the mapper does not implement the given method.
  // Throws `Error` when the mapper does not return a Thennable object.
  this._callMapper = function (method, args) {
    var _this5 = this;

    var promise;

    if (!this.mapper) {
      throw new Error("" + this + "._callMapper: no mapper defined, assign one to `" + this + ".mapper`");
    }

    if (typeof this.mapper[method] !== "function") {
      throw new Error("" + this + "._callMapper: mapper does not implement `" + method + "`");
    }

    promise = this.mapper[method].apply(this.mapper, args);

    if (!promise || typeof promise.then !== "function") {
      throw new Error("" + this + "._callMapper: mapper's `" + method + "` method did not return a Promise");
    }

    promise["catch"](function (error) {
      console.warn("" + _this5 + "#_callMapper(" + method + "): promise rejection:", error);
      return Promise.reject(error);
    });

    return promise;
  };

  // Internal: Holds the association descriptors created by `.hasOne` and `.hasMany`.
  this.prototype.associations = {};

  // Internal: Holds the validators registered by `.validate`.
  this.prototype.validators = {};

  // Internal: Initializes the model by setting up some internal properties.
  this.prototype.init = function (props) {
    this.sourceState = NEW;
    this.isBusy = false;
    this.__promise__ = Promise.resolve();
    this._clearChanges();

    Model.__super__.init.call(this, props);
  };

  this.prop("id", {
    get: function get() {
      return this.__id;
    },
    set: function set(id) {
      if (this.__id) {
        throw new Error("" + this.constructor + "#id=: overwriting a model's identity is not allowed: " + this);
      }

      this.__id = id;

      _id_map2["default"].insert(this);
    }
  });

  this.prop("sourceState");

  this.prop("isNew", {
    on: ["sourceState"],
    get: function get(sourceState) {
      return sourceState === NEW;
    }
  });

  this.prop("isEmpty", {
    on: ["sourceState"],
    get: function get(sourceState) {
      return sourceState === EMPTY;
    }
  });

  this.prop("isLoaded", {
    on: ["sourceState"],
    get: function get(sourceState) {
      return sourceState === LOADED;
    }
  });

  this.prop("isDeleted", {
    on: ["sourceState"],
    get: function get(sourceState) {
      return sourceState === DELETED;
    }
  });

  this.prop("isBusy");

  // Public: Returns an object of changes made for properties on the receiver. For simple properties
  // and `hasOne` associations, the original value is stored. For `hasMany` associations, the added
  // and removed models are stored.
  this.prop("changes", {
    get: function get() {
      return this.__changes = this.__changes || {};
    }
  });

  // Public: Returns a boolean indicating whether the model has any property changes or any
  // owned `hasMany` associations that have been mutated.
  this.prop("hasOwnChanges", {
    on: ["changes"],
    get: function get(changes) {
      return Object.keys(changes).length > 0;
    }
  });

  // Public: Returns a boolean indicating whether the model has any changes or if any of its owned
  // associated models have changes.
  this.prop("hasChanges", {
    on: ["changes"],
    pure: false,
    get: function get() {
      if (this.hasOwnChanges) {
        return true;
      }

      var r = false;

      util.detectRecursion(this, (function () {
        for (var _name4 in this.associations) {
          if (!this.associations[_name4].owner) {
            continue;
          }

          if (this.associations[_name4].type === "hasOne") {
            if (this[_name4] && this[_name4].hasChanges) {
              r = true;
            }
          } else if (this.associations[_name4].type === "hasMany") {
            if (this[_name4].some(function (m) {
              return m.hasChanges;
            })) {
              r = true;
            }
          }
        }
      }).bind(this));

      return r;
    }
  });

  // Public: Object containing any validation errors on the model. The keys of the object are the
  // properties that have errors and the values are an array of error messages.
  this.prop("ownErrors", {
    get: function get() {
      return this.__ownErrors = this.__ownErrors || {};
    }
  });

  // Public: Returns a boolean indicating whether the model has any validation errors on its own
  // properties. Marking the model for destruction by setting the `_destroy` attribute will cause
  // this property to return `false` regardless of whether there are validation errors.
  this.prop("hasOwnErrors", {
    on: ["ownErrors", "_destroy"],
    get: function get(ownErrors, _destroy) {
      return !_destroy && Object.keys(ownErrors).length > 0;
    }
  });

  // Public: Returns a boolean indicating whether the model has any validattion errors or if any of
  // its owned associated models have validation errors.
  this.prop("hasErrors", {
    on: ["hasOwnErrors"],
    pure: false,
    get: function get() {
      if (this.hasOwnErrors) {
        return true;
      }

      var r = false;

      util.detectRecursion(this, (function () {
        for (var _name5 in this.associations) {
          if (!this.associations[_name5].owner) {
            continue;
          }

          if (this.associations[_name5].type === "hasOne") {
            if (this[_name5] && this[_name5].hasErrors) {
              r = true;
            }
          } else if (this.associations[_name5].type === "hasMany") {
            if (this[_name5].some(function (m) {
              return m.hasErrors;
            })) {
              r = true;
            }
          }
        }
      }).bind(this));

      return r;
    }
  });

  // Public: Used to mark a model for future destruction by the server. Owned associated models that
  // are marked for destruction will not be validated or affect the `hasErrors` property.
  this.attr("_destroy", "boolean");

  // Public: Returns an object containing the raw values of all the receiver's attributes. Special
  // care is taken with the `_destroy` attribute, its only included if its been set.
  this.prototype.attrs = function () {
    var attrs = {};

    for (var k in this.__props__) {
      if (this.__props__[k].attr) {
        attrs[k] = this.__props__[k].converter.serialize(this[k]);
      }
    }

    if (typeof this.id !== "undefined") {
      attrs.id = this.id;
    }
    if (attrs._destroy === undefined) {
      delete attrs._destroy;
    }

    return attrs;
  };

  // Public: Refreshes the model by getting it from the data mapper.
  //
  // opts - An object to forward along to the mapper (default: `{}`).
  //
  // Returns the receiver.
  // Throws `Error` if the receiver is not LOADED or is BUSY.
  this.prototype.get = function () {
    var opts = arguments[0] === undefined ? {} : arguments[0];

    if (!this.isLoaded && !this.isEmpty || this.isBusy) {
      throw new Error("" + this.constructor + "#get: can't get a model in the " + this.stateString() + " state: " + this);
    }

    return this.constructor.get(this.id, Object.assign({}, opts, { refresh: true }));
  };

  // Public: Saves the model by invoking either the `create` or `update` method on the model's data
  // mapper. The `create` method is invoked if the model is in the `NEW` state and `create`
  // otherwise.
  //
  // opts - An object to forward on to the mapper (default: `{}`).
  //
  // Returns the receiver.
  // Throws `Error` if the receiver is not NEW or LOADED or is currently busy.
  this.prototype.save = function () {
    var _this6 = this;

    var opts = arguments[0] === undefined ? {} : arguments[0];

    if (!this.isNew && !this.isLoaded || this.isBusy) {
      throw new Error("" + this.constructor + "#save: can't save a model in the " + this.stateString() + " state: " + this);
    }

    this.isBusy = true;

    this.__promise__ = this.constructor._callMapper(this.isNew ? "create" : "update", [this, opts]).then(function (attrs) {
      _this6.isBusy = false;
      try {
        _this6.load(attrs);
      } catch (e) {
        console.error(e);throw e;
      }
    }, function (errors) {
      _this6.isBusy = false;
      _this6._loadErrors(errors);
      return Promise.reject(errors);
    });

    return this;
  };

  // Public: Deletes the model by passing it to the data mapper's `delete` method.
  //
  // opts - An object to forward on to the mapper (default: `{}`).
  //
  // Returns the receiver.
  // Throws `Error` if the model is currently busy.
  this.prototype["delete"] = function () {
    var _this7 = this;

    var opts = arguments[0] === undefined ? {} : arguments[0];

    if (this.isDeleted) {
      return this;
    }

    if (this.isBusy) {
      throw new Error("" + this.constructor + "#delete: can't delete a model in the " + this.stateString() + " state: " + this);
    }

    if (this.isNew) {
      mapperDeleteSuccess.call(this);
    } else {
      this.isBusy = true;

      this.__promise__ = this.constructor._callMapper("delete", [this, opts]).then(function () {
        mapperDeleteSuccess.call(_this7);
      }, function (errors) {
        _this7.isBusy = false;
        _this7._loadErrors(errors);
        return Promise.reject(errors);
      });
    }

    return this;
  };

  // Public: Registers fulfillment and rejection handlers on the latest promise object returned by
  // the model's mapper. If the model has yet to interact with the mapper, then the `onFulfilled`
  // handler is invoked immediately.
  //
  // When resolved, the `onFulfilled` handler is called with no arguments. When rejected, the
  // `onFulfilled` handler is called with the error message from the mapper.
  //
  // onFulfilled - A function to be invoked when the latest promise from the mapper is resolved.
  // onRejected  - A function to be invoked when the latest promise from the mapper is rejected.
  //
  // Returns a new `Promise` that will be resolved with the return value of `onFulfilled`.
  this.prototype.then = function (onFulfilled, onRejected) {
    return this.__promise__.then(onFulfilled, onRejected);
  };

  // Public: Registers a rejection handler on the latest promise object returned by the model's
  // mapper.
  //
  // onRejected  - A function to be invoked when the latest promise from the mapper is rejected.
  //
  // Returns a new `Promise` that is resolved to the return value of the callback if it is called.
  this.prototype["catch"] = function (onRejected) {
    return this.__promise__["catch"](onRejected);
  };

  // Public: Loads the given attributes into the model. This method simply ensure's that the
  // receiver has its `id` set and then delegates to `Model.load`.
  //
  // Returns the receiver.
  this.prototype.load = function (attrs) {
    var id = attrs.id;

    if (id == null && this.id == null) {
      throw new Error("" + this.constructor + "#load: an `id` attribute is required");
    }

    if (id != null && this.id != null && id !== this.id) {
      throw new Error("" + this.constructor + "#load: received attributes with id `" + id + "` but model already has id `" + this.id + "`");
    }

    if (this.id == null) {
      this.id = id;
    }

    attrs.id = this.id;
    this.constructor.load(attrs);

    return this;
  };

  // Public: Returns a string representation of the model's current state.
  this.prototype.stateString = function () {
    var a = [this.sourceState.toUpperCase()];
    if (this.isBusy) {
      a.push("BUSY");
    }
    return a.join("-");
  };

  // Public: Returns the previous for the given attribute or association name. If no change has been
  // made then `undefined` is returned.
  //
  // name - A string containing the name of an attribute or association.
  this.prototype.previousValueFor = function (name) {
    var _this8 = this;

    var change = this.changes[name];

    if (change && this.associations[name] && this.associations[name].type === "hasMany") {
      var _ret4 = (function () {
        var previous = _this8[name].slice();
        var removed = change.removed.slice();
        var added = change.added.slice();

        removed.reverse().forEach(function (m) {
          previous.push(m);
        });
        added.forEach(function (m) {
          previous.splice(previous.indexOf(m), 1);
        });

        return {
          v: previous
        };
      })();

      if (typeof _ret4 === "object") return _ret4.v;
    } else {
      return change;
    }
  };

  // Public: Undoes all property and owned assocation changes made to this model since it was last
  // loaded.
  //
  // opts - An object containing zero or more of the following keys:
  //   except - Either a string or an array of strings of owned association names to skip over when
  //            undoing changes on owned associations.
  //
  // Returns the receiver.
  this.prototype.undoChanges = function () {
    var _this9 = this;

    var opts = arguments[0] === undefined ? {} : arguments[0];

    var associations = this.associations;

    var _loop3 = function (prop) {
      if (associations[prop] && associations[prop].type === "hasMany") {
        var removed = _this9.changes[prop].removed.slice();
        var added = _this9.changes[prop].added.slice();

        removed.reverse().forEach(function (m) {
          _this9[prop].push(m);
        });
        added.forEach(function (m) {
          _this9[prop].splice(_this9[prop].indexOf(m), 1);
        });
      } else {
        _this9[prop] = _this9.changes[prop];
      }
    };

    for (var prop in this.changes) {
      _loop3(prop);
    }

    util.detectRecursion(this, (function () {
      for (var _name6 in associations) {
        var desc = associations[_name6];

        if (!desc.owner) {
          continue;
        }
        if (opts.except === _name6) {
          continue;
        }
        if (Array.isArray(opts.except) && opts.except.indexOf(_name6) >= 0) {
          continue;
        }

        if (desc.type === "hasOne") {
          this[_name6] && this[_name6].undoChanges();
        } else if (desc.type === "hasMany") {
          this[_name6].forEach(function (m) {
            return m.undoChanges();
          });
        }
      }
    }).bind(this));

    this.validate();

    return this;
  };

  // Public: Add a validation error for the given property name and type. Adding an error will cause
  // the model to enter an invalid state.
  //
  // name    - The name of the attribute or property that has a validation error.
  // message - A string containing the error message.
  //
  // Returns the receiver.
  this.prototype.addError = function (name, message) {
    this.ownErrors[name] = this.ownErrors[name] || [];

    if (this.ownErrors[name].indexOf(message) === -1) {
      this.ownErrors[name].push(message);
      this.didChange("ownErrors");
    }

    return this;
  };

  // Public: Runs registered validators for the given attribute. This will clear any existing
  // validation errors for the given attribute.
  //
  // name - The name of the attribute to run validations for.
  //
  // Returns `true` if no validation errors are found on the given attribute and `false` otherwise.
  this.prototype.validateAttr = function (name) {
    this._clearErrors(name);

    if (!this.validators[name]) {
      return true;
    }

    for (var i = 0, n = this.validators[name].length; i < n; i++) {
      var validator = this.validators[name][i];
      if (typeof validator === "function") {
        validator.call(this);
      } else if (typeof validator === "string" && validator in this) {
        this[validator]();
      } else {
        throw new Error("" + this.constructor + "#validateAttr: don't know how to execute validator: `" + validator + "`");
      }
    }

    return !(name in this.ownErrors);
  };

  // Public: Runs all registered validators for all properties and also validates owned
  // associations.
  //
  // Returns `true` if no validation errors are found and `false` otherwise.
  this.prototype.validate = function () {
    var associations = this.associations;

    this._clearErrors();

    for (var _name7 in this.validators) {
      this.validateAttr(_name7);
    }

    util.detectRecursion(this, (function () {
      for (var _name8 in associations) {
        var desc = associations[_name8];

        if (!desc.owner) {
          continue;
        }

        if (desc.type === "hasOne") {
          this[_name8] && !this[_name8]._destroy && this[_name8].validate();
        } else if (desc.type === "hasMany") {
          this[_name8].forEach(function (m) {
            return !m._destroy && m.validate();
          });
        }
      }
    }).bind(this));

    return !this.hasErrors;
  };

  // Public: Returns a string representation of the model.
  this.prototype.toString = function () {
    var attrs = this.attrs();

    for (var _name9 in this.associations) {
      if (this.associations[_name9].type === "hasOne") {
        if (this[_name9] && this[_name9].id) {
          attrs[_name9] = this[_name9].id;
        }
      } else if (this.associations[_name9].type === "hasMany") {
        var ids = this[_name9].map(function (x) {
          return x.id;
        }).compact();
        if (ids.length) {
          attrs[_name9] = ids;
        }
      }
    }

    return "#<" + this.constructor + " (" + this.stateString() + "):" + this.objectId + " " + JSON.stringify(attrs) + ">";
  };

  // Internal: Load error message(s) received from the mapper. When passed an object, the keys of
  // the object are assumed to be attribute names and the values the error message for that
  // attribute. When given a string, an error is added to the `base` attribute.
  //
  // errors - Either an object mapping attribute names to their error messages or a string.
  //
  // Returns the receiver.
  this.prototype._loadErrors = function (errors) {
    var _this10 = this;

    if (typeof errors === "object") {
      var _loop4 = function (k) {
        if (Array.isArray(errors[k])) {
          errors[k].forEach(function (error) {
            this.addError(k, error);
          }, _this10);
        } else {
          _this10.addError(k, String(errors[k]));
        }
      };

      for (var k in errors) {
        _loop4(k);
      }
    } else {
      this.addError("base", String(errors));
    }

    return this;
  };

  // Internal: Clears validation errors from the `errors` hash. If a name is given, only the errors
  // for the property of that name are cleared, otherwise all errors are cleared.
  this.prototype._clearErrors = function (name) {
    if (name) {
      delete this.ownErrors[name];
    } else {
      this.__ownErrors = {};
    }
    this.didChange("ownErrors");
    return this;
  };

  // Internal: Called by an inverse association when a model was removed from the inverse side.
  // Updates the local side of the association.
  //
  // name  - The local side name of the association that was modified.
  // model - The model that was removed from the inverse side.
  //
  // Returns nothing.
  this.prototype._inverseRemoved = function (name, model) {
    var desc = this.associations[name];

    if (!desc) {
      throw new Error("" + this.constructor + "#inverseRemoved: unknown association `" + name + "`");
    }

    if (desc.type === "hasOne") {
      hasOneSet.call(this, desc, undefined, false);
      this.didChange(desc.name);
    } else if (desc.type === "hasMany") {
      this[desc.name]._inverseRemove(model);
    }
  };

  // Internal: Called by an inverse association when a model was added on the inverse side. Updates
  // the local side of the association.
  //
  // name  - The local side name of the association that was modified.
  // model - The model that was added on the inverse side.
  //
  // Returns nothing.
  this.prototype._inverseAdded = function (name, model) {
    var desc = this.associations[name];

    if (!desc) {
      throw new Error("" + this.constructor + "#inverseAdded: unknown association `" + name + "`");
    }

    if (desc.type === "hasOne") {
      hasOneSet.call(this, desc, model, false);
      this.didChange(desc.name);
    } else if (desc.type === "hasMany") {
      this[desc.name]._inverseAdd(model);
    }
  };

  // Internal: Overrides `Basis.Object#_setProp` in order to perform change tracking.
  this.prototype._setProp = function (name, value) {
    var oldValue = Model.__super__._setProp.call(this, name, value);

    if (!this.__props__[name].attr && !this.associations[name]) {
      return;
    }
    if (this.associations[name] && !this.associations[name].owner) {
      return;
    }

    if (!(name in this.changes)) {
      if (!util.eq(this[name], oldValue)) {
        this._setChange(name, oldValue);
      }
    } else if (util.eq(this[name], this.changes[name])) {
      this._clearChange(name);
    }
  };

  // Internal: Sets the old value for the changed property of the given name.
  this.prototype._setChange = function (name, oldValue) {
    if (loads.length) {
      return;
    }
    this.changes[name] = oldValue;
    this.didChange("changes");
  };

  // Internal: Clears the change record for the property of the given name.
  this.prototype._clearChange = function (name) {
    delete this.changes[name];
    this.didChange("changes");
  };

  // Internal: Clears all change records.
  this.prototype._clearChanges = function () {
    this.__changes = {};
    this.didChange("changes");
  };
});

Model.NEW = NEW;
Model.EMPTY = EMPTY;
Model.LOADED = LOADED;
Model.DELETED = DELETED;

Object.assign(Model, _validations2["default"]["static"]);
Object.assign(Model.prototype, _validations2["default"].instance);

exports["default"] = Model;
module.exports = exports["default"];
