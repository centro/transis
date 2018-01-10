"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var registeredAttrs = {},
    subclasses = {},
    loads = [];

var NEW = 'new';
var EMPTY = 'empty';
var LOADED = 'loaded';
var DELETED = 'deleted';

// Internal: Returns the `Transis.Model` subclass with the given name.
//
// name  - A string representing the name of a `Transis.Model` subclass.
// raise - A boolean indicating whether an exception should be raised if the name can't be
//         resolved (default: `true`).
//
// Returns the resolved subclass constructor function or `undefined` if a class with the given
//   name is not known.
// Throws `Error` if the `raise` argument is `true` and the name cannot not be resolved.
function resolve(name) {
  var raise = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

  var klass = typeof name === 'function' ? name : subclasses[name];

  if (!klass && raise) {
    throw new Error("Transis.Model.resolve: could not resolve subclass: `" + name + "`");
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
    throw new Error(desc.debugName + ": expected an object of type `" + desc.klass + "` but received `" + o + "` instead");
  }
}

// Internal: Wraps the given promise so that subsequent chained promises are called after the next
// flush cycle has been run.
function wrapPromise(promise) {
  return promise.then(function (value) {
    return new Promise(function (resolve, reject) {
      _object2.default.delay(function () {
        resolve(value);
      });
      _object2.default._queueFlush();
    });
  }, function (reason) {
    return new Promise(function (resolve, reject) {
      _object2.default.delay(function () {
        reject(reason);
      });
      _object2.default._queueFlush();
    });
  });
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

  removed = _array2.default.prototype._splice.call(this, i, n, added);

  if (inverse && !this.__handlingInverse__) {
    removed.forEach(function (model) {
      model._inverseRemoved(inverse, owner);
    }, this);
    added.forEach(function (model) {
      model._inverseAdded(inverse, owner);
    }, this);
  }

  if (desc.owner && !loads.length) {
    changes = owner.ownChanges[name] = owner.ownChanges[name] || { added: [], removed: [] };

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
// `Transis.Array` that overrides the `_splice` method in order to handle syncing the inverse side
// of the association.
function hasManyArray(owner, desc) {
  var a = _array2.default.of();
  a.proxy(owner, desc.name);
  a.__owner__ = owner;
  a.__desc__ = desc;
  a._splice = hasManySplice;
  a._inverseAdd = hasManyInverseAdd;
  a._inverseRemove = hasManyInverseRemove;
  return a;
}

// Internal: Provides the implementation of the query array's `query` method.
function queryArrayQuery() {
  var _this = this;

  var queryOpts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var opts = Object.assign({}, this.baseOpts, queryOpts);

  if (this.isPaged) {
    opts.page = opts.page || 1;
  }

  if (this.isBusy) {
    if (util.eq(opts, this.currentOpts)) {
      return this;
    }

    if (!this.__queued__) {
      this.__promise__ = this.__promise__.then(function () {
        _this.query(_this.__queued__);
        _this.__queued__ = undefined;
        return _this.__promise__;
      });
    }

    this.__queued__ = opts;
  } else {
    this.isBusy = true;
    this.currentOpts = opts;
    this.__promise__ = wrapPromise(this.__modelClass__._callMapper('query', [opts]).then(function (result) {
      var results = Array.isArray(result) ? result : result.results;
      var meta = Array.isArray(result) ? {} : result.meta;

      _this.isBusy = false;
      _this.meta = meta;
      _this.error = undefined;

      if (!results) {
        throw new Error(_this + "#query: mapper failed to return any results");
      }

      if (_this.isPaged && typeof meta.totalCount !== 'number') {
        throw new Error(_this + "#query: mapper failed to return total count for paged query");
      }

      try {
        var models = _this.__modelClass__.loadAll(results);

        if (_this.isPaged) {
          _this.length = meta.totalCount;
          _this.splice.apply(_this, [(opts.page - 1) * _this.baseOpts.pageSize, models.length].concat(models));
        } else {
          _this.replace(models);
        }
      } catch (e) {
        console.error(e);throw e;
      }
    }, function (e) {
      _this.isBusy = false;
      _this.error = e;
      return Promise.reject(e);
    }));
  }

  return this;
}

// Internal: Provides the implementation of the query array's `then` method.
function queryArrayThen(f1, f2) {
  return this.__promise__.then(f1, f2);
}

// Internal: Provides the implementation of the query array's `catch` method.
function queryArrayCatch(f) {
  return this.__promise__.catch(f);
}

// Internal: Provides the implementation of the query array's `at` method.
function queryArrayAt(i) {
  var r = _array2.default.prototype.at.apply(this, arguments);
  var pageSize = this.baseOpts && this.baseOpts.pageSize;

  if (arguments.length === 1 && !r && pageSize) {
    this.query({ page: Math.floor(i / pageSize) + 1 });
  }

  return r;
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
    prev.unproxy(this, name);
  }
  if (v) {
    v.proxy(this, name);
  }
}

// Internal: Callback for a successful model deletion. Updates the model's state, removes it from
// the identity map, and removes removes it from any associations its currently participating in.
function mapperDeleteSuccess() {
  var _this2 = this;

  _id_map2.default.delete(this);
  this.isBusy = false;
  this.sourceState = DELETED;
  this._clearErrors();

  var _loop = function _loop(name) {
    var desc = _this2.associations[name];
    if (!desc.inverse) {
      return "continue";
    }
    if (desc.type === 'hasOne') {
      var m = void 0;
      if (m = _this2[name]) {
        m._inverseRemoved(desc.inverse, _this2);
      }
    } else if (desc.type === 'hasMany') {
      _this2[name].slice(0).forEach(function (m) {
        m._inverseRemoved(desc.inverse, _this2);
      });
    }
  };

  for (var name in this.associations) {
    var _ret = _loop(name);

    if (_ret === "continue") continue;
  }
}

var Model = _object2.default.extend(function () {
  this.displayName = 'Transis.Model';

  // Public: Creates a subclass of `Transis.Model`. This method overrides the `Transis.Object.extend`
  // method in order to force `Model` subclasses to be named.
  this.extend = function (name, f) {
    if (typeof name !== 'string') {
      throw new Error(this + ".extend: a name is required");
    }

    var subclass = _object2.default.extend.call(this);
    subclass.displayName = name;
    subclasses[name] = subclass;

    if (typeof f === 'function') {
      f.call(subclass);
    }

    if (this.displayName !== 'Transis.Model') {
      this.subclasses = this.subclasses || [];
      this.subclasses.push(name);
    }

    return subclass;
  };

  this.resolveSubclass = function (name) {
    if (!this.subclasses || this.subclasses.indexOf(name) < 0) {
      throw new Error(this + ".resolveSubclass: could not find subclass " + name);
    }

    return resolve(name);
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
      throw new Error(this + ".registerAttr: an attribute with the name `" + name + "` has already been defined");
    }

    registeredAttrs[name] = converter;

    return this;
  };

  this.registerAttr('identity', attrs.IdentityAttr);
  this.registerAttr('string', attrs.StringAttr);
  this.registerAttr('integer', attrs.IntegerAttr);
  this.registerAttr('number', attrs.NumberAttr);
  this.registerAttr('boolean', attrs.BooleanAttr);
  this.registerAttr('date', attrs.DateAttr);
  this.registerAttr('datetime', attrs.DateTimeAttr);

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
    var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    var converter = registeredAttrs[type];

    if (!converter) {
      throw new Error(this + ".attr: unknown attribute type: `" + type + "`");
    }

    if (typeof converter === 'function') {
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
        this[name + "BeforeCoercion"] = v;
      },
      default: 'default' in opts ? opts.default : undefined
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
    var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    var desc;

    if (!this.prototype.hasOwnProperty('associations')) {
      this.prototype.associations = Object.create(this.prototype.associations);
    }

    this.prototype.associations[name] = desc = Object.assign({}, opts, {
      type: 'hasOne', name: name, klass: klass, debugName: this.toString() + "#" + name
    });

    if (desc.owner) {
      if (!this.prototype.hasOwnProperty('__deps__')) {
        this.prototype.__deps__ = Object.create(this.prototype.__deps__);
      }

      (this.prototype.__deps__[name + ".errors"] = this.prototype.__deps__[name + ".errors"] || []).push('errors');
      (this.prototype.__deps__[name + ".changes"] = this.prototype.__deps__[name + ".changes"] || []).push('changes');
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
    var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    var k = "__" + name,
        desc;

    if (!this.prototype.hasOwnProperty('associations')) {
      this.prototype.associations = Object.create(this.prototype.associations);
    }

    this.prototype.associations[name] = desc = Object.assign({}, opts, {
      type: 'hasMany', name: name, klass: klass, singular: (0, _pluralize2.default)(name, 1), debugName: this.toString() + "#" + name
    });

    if (desc.owner) {
      if (!this.prototype.hasOwnProperty('__deps__')) {
        this.prototype.__deps__ = Object.create(this.prototype.__deps__);
      }

      (this.prototype.__deps__[name + ".errors"] = this.prototype.__deps__[name + ".errors"] || []).push('errors');
      (this.prototype.__deps__[name + ".changes"] = this.prototype.__deps__[name + ".changes"] || []).push('changes');
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
  // opts - An `on:` option can be provided to specify the context in which to validate.
  //
  // Returns the receiver.
  this.validate = function (name, f) {
    var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    if (!this.prototype.hasOwnProperty('validators')) {
      this.prototype.validators = Object.create(this.prototype.validators);
    }

    (this.prototype.validators[name] = this.prototype.validators[name] || []).push({ validator: f, opts: opts });

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
        model,
        LoadKlass;

    if (id == null) {
      throw new Error(this + ".load: an `id` attribute is required");
    }

    loads.push(true);

    attrs = Object.assign({}, attrs);
    if (typeof this.getSubclass === 'function') {
      LoadKlass = this.resolveSubclass(this.getSubclass(attrs));
    } else {
      LoadKlass = this;
    }

    model = _id_map2.default.get(LoadKlass, id) || new LoadKlass();

    delete attrs.id;

    // extract associated attributes
    for (var name in associations) {
      var _desc = associations[name];

      if (name in attrs) {
        associated[name] = attrs[name];
        delete attrs[name];
      } else if (_desc.type === 'hasOne' && name + "Id" in attrs) {
        associated[name] = attrs[name + "Id"];
        delete attrs[name + "Id"];
      } else if (_desc.type === 'hasOne' && name + "_id" in attrs) {
        associated[name] = attrs[name + "_id"];
        delete attrs[name + "_id"];
      } else if (_desc.type === 'hasMany' && _desc.singular + "Ids" in attrs) {
        associated[name] = attrs[_desc.singular + "Ids"];
        delete attrs[_desc.singular + "Ids"];
      } else if (_desc.type === 'hasMany' && _desc.singular + "_ids" in attrs) {
        associated[name] = attrs[_desc.singular + "_ids"];
        delete attrs[_desc.singular + "_ids"];
      }
    }

    // set non-association attributes
    model.set(attrs);

    // set id if necessary
    if (model.id === undefined) {
      model.id = id;
    }

    // load and set each association

    var _loop2 = function _loop2(_name) {
      var klass = resolve(associations[_name].klass);
      var data = associated[_name];

      // clear association
      if (!data) {
        model[_name] = null;
        return "continue";
      }

      if (associations[_name].type === 'hasOne') {
        var other = (typeof data === "undefined" ? "undefined" : _typeof(data)) === 'object' ? klass.load(data) : klass.local(data);
        model[_name] = other;
      } else if (associations[_name].type === 'hasMany') {
        var others = [];
        data.forEach(function (o) {
          others.push((typeof o === "undefined" ? "undefined" : _typeof(o)) === 'object' ? klass.load(o) : klass.local(o));
        });
        model[_name] = others;
      }
    };

    for (var _name in associated) {
      var _ret2 = _loop2(_name);

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
    var _this3 = this;

    return objects.map(function (object) {
      return _this3.load(object);
    });
  };

  // Public: Creates a new query array but does not invoke its `query` method. This is useful for
  // cases where you want to initialize an empty query, but not yet run it.
  //
  // The array returned by this method is decorated with the following additional properties:
  //
  //   modelClass  - The `Transis.Model` subclass that `buildQuery` was invoked on.
  //   baseOpts    - The options passed to this method. These options will be sent with every query.
  //   currentOpts - The most recent options passed to the mapper.
  //   isBusy      - Boolean property indicating whether a query is in progress.
  //   isPaged     - Indicates whether the query array pages its results.
  //   error       - An error message set on the array when the mapper fails to fulfill its promise.
  //   meta        - Metadata provided by the mapper. May be used for paging results.
  //
  // And with these additional methods:
  //
  //   query: Execute a query by invoking the `query` method on the modelClass's mapper. This will
  //   put the array into a busy state (indicated by the `isBusy` property) until the mapper has
  //   fulfilled its promise. When the promise is successfully resolved, the returned data is loaded
  //   via `Transis.Model.loadAll` and the materialized models are replaced into the array. When the
  //   promise is rejected, the error message returned by the mapper is made available on the `error`
  //   property.
  //
  //   If the this method is called while the array is currently busy, then the call to the mapper
  //   is queued until the current query completes.
  //
  //   Passing the `pageSize` option to `buildQuery` turns the query into a paged query. Paged
  //   queries load a page of results at a time instead of simply replacing their contents on each
  //   call to `#query`. In order for this to work the mapper must resolve its promise with an
  //   object that contains a `results` key pointing to an array of records and a `meta` key that
  //   points to an object containing a `totalCount` key. The length of the query array will be set
  //   to the value of `totalCount` and the results will be spliced into the array at the offset
  //   indicated by the `page` option. Any models from pages loaded previously will remain in the
  //   array.
  //
  //   When an item is accessed via the `#at` method from a page that has yet to be fetched, the
  //   query array will automatically invoke the mapper to fetch that page. This effectively gives
  //   you a sparse array that will automatically lazily load its contents when they are needed.
  //   This behavior works very well with a virtualized list component.
  //
  //   Here is an example of the object expected from the mapper:
  //
  //   {
  //     meta: {totalCount: 321},
  //     results: [{id: 1}, {id: 2}, {id: 3}]
  //   }
  //
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
  // baseOpts - An object to pass along to the mapper method when the query is executed with the
  //            `#query` method. Any options passed to the `#query` method will be merged in with
  //            the options given here (default: `{}`). The `pageSize` option in particular is
  //            special as it makes the resulting query array a paged query. See the discussion
  //            above.
  //
  // Returns a new `Transis.Array` decorated with the properties and methods described above.
  this.buildQuery = function () {
    var baseOpts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var a = _array2.default.of();

    a.__modelClass__ = this;
    a.__promise__ = wrapPromise(Promise.resolve());

    a.props({
      modelClass: { get: function get() {
          return this.__modelClass__;
        } },
      baseOpts: {},
      currentOpts: {},
      isBusy: { default: false },
      isPaged: { on: ['baseOpts'], get: function get(baseOpts) {
          return typeof baseOpts.pageSize === 'number';
        } },
      error: {},
      meta: {}
    });

    a.baseOpts = baseOpts;
    a.query = queryArrayQuery;
    a.then = queryArrayThen;
    a.catch = queryArrayCatch;
    a.at = queryArrayAt;

    return a;
  };

  // Public: Creates a new `Transis.QueryArray` and invokes its `query` method with the given
  // options.
  //
  // opts - An options object to pass to the `Transis.QueryArray#query` method (default: `{}`).
  //
  // Returns a new `Transis.QueryArray`.
  this.query = function () {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return this.buildQuery().query(opts);
  };

  // Public: Retrieves a model from the identity map or creates a new empty model instance. If you
  // want to get the model from the mapper, then use the `Model.get` method.
  //
  // id - The id of the model to get.
  //
  // Returns an instance of the receiver.
  this.local = function (id) {
    return _id_map2.default.get(this, id) || this.empty(id);
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

    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var model = this.local(id),
        getOpts = Object.assign({}, opts);
    delete getOpts.refresh;

    if (model.isEmpty || opts.refresh) {
      model.isBusy = true;
      model.__promise__ = wrapPromise(this._callMapper('get', [id, getOpts]).then(function (result) {
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
      }));
    }

    return model;
  };

  // Public: Clears all models from the id map. This will subsequently cause the model layer to go
  // to the mapper for any model that had previously been loaded.
  this.clearIdMap = function () {
    _id_map2.default.clear();return this;
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
      throw new Error(this + "._callMapper: no mapper defined, assign one to `" + this + ".mapper`");
    }

    if (typeof this.mapper[method] !== 'function') {
      throw new Error(this + "._callMapper: mapper does not implement `" + method + "`");
    }

    promise = this.mapper[method].apply(this.mapper, args);

    if (!promise || typeof promise.then !== 'function') {
      throw new Error(this + "._callMapper: mapper's `" + method + "` method did not return a Promise");
    }

    promise.catch(function (error) {
      console.warn(_this5 + "#_callMapper(" + method + "): promise rejection:", error);
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
    this.__promise__ = wrapPromise(Promise.resolve());
    this._clearChanges();

    Model.__super__.init.call(this, props);
  };

  this.prop('id', {
    get: function get() {
      return this.__id;
    },
    set: function set(id) {
      if (this.__id) {
        throw new Error(this.constructor + "#id=: overwriting a model's identity is not allowed: " + this);
      }

      this.__id = id;

      _id_map2.default.insert(this);
    }
  });

  this.prop('sourceState');

  this.prop('isNew', {
    on: ['sourceState'],
    get: function get(sourceState) {
      return sourceState === NEW;
    }
  });

  this.prop('isEmpty', {
    on: ['sourceState'],
    get: function get(sourceState) {
      return sourceState === EMPTY;
    }
  });

  this.prop('isLoaded', {
    on: ['sourceState'],
    get: function get(sourceState) {
      return sourceState === LOADED;
    }
  });

  this.prop('isDeleted', {
    on: ['sourceState'],
    get: function get(sourceState) {
      return sourceState === DELETED;
    }
  });

  this.prop('isBusy');

  // Public: Returns an object of changes made to properties on the receiver. For simple properties
  // and `hasOne` associations, the original value is stored. For `hasMany` associations, the added
  // and removed models are stored.
  this.prop('ownChanges', {
    get: function get() {
      return this.__ownChanges = this.__ownChanges || {};
    }
  });

  // Public: Returns a boolean indicating whether the model has any property changes or any
  // owned `hasMany` associations that have been mutated.
  this.prop('hasOwnChanges', {
    on: ['ownChanges'],
    get: function get(ownChanges) {
      return Object.keys(ownChanges).length > 0;
    }
  });

  // Public: Returns an object of changes made to properties on the receiver as well as for changes
  // made to owned associated models. The keys for owned associated model changes are prefixed with
  // the association name. The keys for changes on models within an owned hasMany association are
  // prefixed with the association name and index in the array.
  //
  // Examples
  //
  //   person.changes;
  //   // {'firstName': 'Bob', 'address.street': 'maple', 'pets.1.name': 'Spike'}
  this.prop('changes', {
    on: ['ownChanges'],
    pure: false,
    get: function get() {
      var changes = Object.assign({}, this.ownChanges);

      util.detectRecursion(this, function () {
        var _this6 = this;

        var _loop3 = function _loop3(name) {
          if (!_this6.associations[name].owner) {
            return "continue";
          }

          if (_this6.associations[name].type === 'hasOne' && _this6[name]) {
            var cs = _this6[name].changes;
            for (var k in cs) {
              changes[name + "." + k] = cs[k];
            }
          } else if (_this6.associations[name].type === 'hasMany') {
            _this6[name].forEach(function (item, i) {
              var cs = item.changes;
              for (var _k in cs) {
                changes[name + "." + i + "." + _k] = cs[_k];
              }
            });
          }
        };

        for (var name in this.associations) {
          var _ret3 = _loop3(name);

          if (_ret3 === "continue") continue;
        }
      }.bind(this));

      return changes;
    }
  });

  // Public: Returns a boolean indicating whether the model has any changes or if any of its owned
  // associated models have changes.
  this.prop('hasChanges', {
    on: ['changes'],
    get: function get(changes) {
      return !!Object.keys(changes).length;
    }
  });

  // Public: Object containing any validation errors on the model. The keys of the object are the
  // properties that have errors and the values are an array of error messages.
  this.prop('ownErrors', {
    get: function get() {
      return this.__ownErrors = this.__ownErrors || {};
    }
  });

  // Public: Returns a boolean indicating whether the model has any validation errors on its own
  // properties. Marking the model for destruction by setting the `_destroy` attribute will cause
  // this property to return `false` regardless of whether there are validation errors.
  this.prop('hasOwnErrors', {
    on: ['ownErrors', '_destroy'],
    get: function get(ownErrors, _destroy) {
      return !_destroy && Object.keys(ownErrors).length > 0;
    }
  });

  // Public: Returns an object of validation errors that exist on the receiver as well as any
  // validation errors on owned associated models not marked for destruction. The keys used for
  // errors on owned associated models are similar to those returned by the `#changes` prop.
  this.prop('errors', {
    on: ['ownErrors'],
    pure: false,
    get: function get() {
      var errors = Object.assign({}, this.ownErrors);

      util.detectRecursion(this, function () {
        var _this7 = this;

        var _loop4 = function _loop4(name) {
          if (!_this7.associations[name].owner) {
            return "continue";
          }

          if (_this7.associations[name].type === 'hasOne' && _this7[name] && !_this7[name]._destroy) {
            var es = _this7[name].errors;
            for (var k in es) {
              errors[name + "." + k] = es[k];
            }
          } else if (_this7.associations[name].type === 'hasMany') {
            _this7[name].forEach(function (item, i) {
              if (item._destroy) return;
              var es = item.errors;
              for (var _k2 in es) {
                errors[name + "." + i + "." + _k2] = es[_k2];
              }
            });
          }
        };

        for (var name in this.associations) {
          var _ret4 = _loop4(name);

          if (_ret4 === "continue") continue;
        }
      }.bind(this));

      return errors;
    }
  });

  // Public: Returns a boolean indicating whether the model has any validattion errors or if any of
  // its owned associated models have validation errors.
  this.prop('hasErrors', {
    on: ['errors'],
    get: function get(errors) {
      return !!Object.keys(errors).length;
    }
  });

  // Public: Used to mark a model for future destruction by the server. Owned associated models that
  // are marked for destruction will not be validated or affect the `hasErrors` property.
  this.attr('_destroy', 'boolean');

  // Public: Returns an object containing the raw values of all the receiver's attributes. Special
  // care is taken with the `_destroy` attribute, its only included if its been set.
  this.prototype.attrs = function () {
    var attrs = {};

    for (var k in this.__props__) {
      if (this.__props__[k].attr) {
        attrs[k] = this.__props__[k].converter.serialize(this[k]);
      }
    }

    if (typeof this.id !== 'undefined') {
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
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    if (!this.isLoaded && !this.isEmpty || this.isBusy) {
      throw new Error(this.constructor + "#get: can't get a model in the " + this.stateString() + " state: " + this);
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
    var _this8 = this;

    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    if (!this.isNew && !this.isLoaded || this.isBusy) {
      throw new Error(this.constructor + "#save: can't save a model in the " + this.stateString() + " state: " + this);
    }

    this.isBusy = true;

    this.__promise__ = wrapPromise(this.constructor._callMapper(this.isNew ? 'create' : 'update', [this, opts]).then(function (attrs) {
      _this8.isBusy = false;
      try {
        _this8.load(attrs);
      } catch (e) {
        console.error(e);throw e;
      }
    }, function (errors) {
      _this8.isBusy = false;
      _this8._loadErrors(errors);
      return Promise.reject(errors);
    }));

    return this;
  };

  // Public: Deletes the model by passing it to the data mapper's `delete` method.
  //
  // opts - An object to forward on to the mapper (default: `{}`).
  //
  // Returns the receiver.
  // Throws `Error` if the model is currently busy.
  this.prototype.delete = function () {
    var _this9 = this;

    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    if (this.isDeleted) {
      return this;
    }

    if (this.isBusy) {
      throw new Error(this.constructor + "#delete: can't delete a model in the " + this.stateString() + " state: " + this);
    }

    if (this.isNew) {
      mapperDeleteSuccess.call(this);
    } else {
      this.isBusy = true;

      this.__promise__ = wrapPromise(this.constructor._callMapper('delete', [this, opts]).then(function () {
        mapperDeleteSuccess.call(_this9);
      }, function (errors) {
        _this9.isBusy = false;
        _this9._loadErrors(errors);
        return Promise.reject(errors);
      }));
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
  this.prototype.catch = function (onRejected) {
    return this.__promise__.catch(onRejected);
  };

  // Public: Loads the given attributes into the model. This method simply ensure's that the
  // receiver has its `id` set and then delegates to `Model.load`.
  //
  // If the given attributes have an `id` that already exists in the identity map, then this method
  // will actually load the attributes onto the existing model instead of the receiver. This
  // situation may occur when you have a create or update situation on the backend.
  //
  // Returns the receiver.
  this.prototype.load = function (attrs) {
    var id = attrs.id;

    if (id == null && this.id == null) {
      throw new Error(this.constructor + "#load: an `id` attribute is required");
    }

    if (id != null && this.id != null && id !== this.id) {
      throw new Error(this.constructor + "#load: received attributes with id `" + id + "` but model already has id `" + this.id + "`");
    }

    if (this.id == null) {
      if (!_id_map2.default.get(this.constructor, id)) {
        this.id = id;
      } else {
        console.warn(this.constructor + "#load: loading attributes that contain an id (" + id + ") that already exists in the identity map, the receiver will not be updated");
      }
    }

    attrs.id = id || this.id;

    this.constructor.load(attrs);

    return this;
  };

  // Public: Returns a string representation of the model's current state.
  this.prototype.stateString = function () {
    var a = [this.sourceState.toUpperCase()];
    if (this.isBusy) {
      a.push('BUSY');
    }
    return a.join('-');
  };

  // Public: Returns the previous for the given attribute or association name. If no change has been
  // made then `undefined` is returned.
  //
  // name - A string containing the name of an attribute or association.
  this.prototype.previousValueFor = function (name) {
    var change = this.ownChanges[name];

    if (change && this.associations[name] && this.associations[name].type === 'hasMany') {
      var previous = this[name].slice();
      var removed = change.removed.slice();
      var added = change.added.slice();

      removed.reverse().forEach(function (m) {
        previous.push(m);
      });
      added.forEach(function (m) {
        previous.splice(previous.indexOf(m), 1);
      });

      return previous;
    } else {
      return change;
    }
  };

  // Public: Undoes all property and owned assocation changes made to this model since it was last
  // loaded.
  //
  // opts - An object containing zero or more of the following keys:
  //   except - Either a string or an array of strings of attributes or owned association names to skip over when
  //            undoing changes.
  //   only -   Either a string or an array of strings of attributes or owned association names that limit the undoing of changes
  //            to only the provided names.
  //
  // Returns the receiver.
  this.prototype.undoChanges = function () {
    var _this10 = this;

    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var associations = this.associations;

    var shouldUndo = function shouldUndo(name) {
      if (!opts) return true;

      if (opts.except === name) {
        return false;
      }
      if (Array.isArray(opts.except) && opts.except.indexOf(name) >= 0) {
        return false;
      }

      if (Array.isArray(opts.only)) {
        if (opts.only.indexOf(name) === -1) {
          return false;
        }
      } else if (opts.only && opts.only !== name) {
        return false;
      }

      return true;
    };

    var _loop5 = function _loop5(prop) {
      if (!shouldUndo(prop)) {
        return "continue";
      }

      if (associations[prop] && associations[prop].type === 'hasMany') {
        var removed = _this10.ownChanges[prop].removed.slice();
        var added = _this10.ownChanges[prop].added.slice();

        removed.reverse().forEach(function (m) {
          _this10[prop].push(m);
        });
        added.forEach(function (m) {
          _this10[prop].splice(_this10[prop].indexOf(m), 1);
        });
      } else {
        _this10[prop] = _this10.ownChanges[prop];
      }
    };

    for (var prop in this.ownChanges) {
      var _ret5 = _loop5(prop);

      if (_ret5 === "continue") continue;
    }

    util.detectRecursion(this, function () {
      for (var name in associations) {
        var _desc2 = associations[name];

        if (!_desc2.owner) {
          continue;
        }
        if (!shouldUndo(name)) {
          continue;
        }

        if (_desc2.type === 'hasOne') {
          this[name] && this[name].undoChanges();
        } else if (_desc2.type === 'hasMany') {
          this[name].forEach(function (m) {
            return m.undoChanges();
          });
        }
      }
    }.bind(this));

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
      this.didChange('ownErrors');
    }

    return this;
  };

  // Public: Runs registered validators for the given attribute. This will clear any existing
  // validation errors for the given attribute. The registered validators can be reduced by
  // providing an optional context.
  //
  // name - The name of the attribute to run validations for.
  // ctx  - The context in which to run validations on the given attribute. (optional)
  //
  // Returns `true` if no validation errors are found on the given attribute and `false` otherwise.
  this.prototype.validateAttr = function (name, ctx) {
    this._clearErrors(name);
    if (!this.validators[name]) {
      return true;
    }

    var validators = this.validators[name].filter(function (v) {
      return !v.opts.on || v.opts.on === ctx;
    });

    for (var i = 0, n = validators.length; i < n; i++) {
      var validator = validators[i].validator;

      if (typeof validator === 'function') {
        validator.call(this);
      } else if (typeof validator === 'string' && validator in this) {
        this[validator]();
      } else {
        throw new Error(this.constructor + "#validateAttr: don't know how to execute validator: `" + validator + "`");
      }
    }

    return !(name in this.ownErrors);
  };

  // Public: Runs all registered validators for all properties and also validates owned
  // associations. Validations with no `on:` option will run no matter the context. Validations with
  // some `on:` option will only run in the specified context.
  //
  // ctx - The context in which to run validations
  //
  // Returns `true` if no validation errors are found and `false` otherwise.
  this.prototype.validate = function (ctx) {
    var associations = this.associations,
        failed = false;

    this._clearErrors();

    for (var name in this.validators) {
      if (!this.validateAttr(name, ctx)) {
        failed = true;
      }
    }

    util.detectRecursion(this, function () {
      for (var _name2 in associations) {
        var _desc3 = associations[_name2];

        if (!_desc3.owner) {
          continue;
        }

        if (_desc3.type === 'hasOne') {
          if (this[_name2] && !this[_name2]._destroy) {
            if (!this[_name2].validate(ctx)) {
              failed = true;
            }
          }
        } else if (_desc3.type === 'hasMany') {
          this[_name2].forEach(function (m) {
            if (!m._destroy && !m.validate(ctx)) {
              failed = true;
            }
          });
        }
      }
    }.bind(this));

    return !failed;
  };

  // Public: Returns a string representation of the model.
  this.prototype.toString = function () {
    var attrs = this.attrs();

    for (var name in this.associations) {
      if (this.associations[name].type === 'hasOne') {
        if (this[name] && this[name].id) {
          attrs[name] = this[name].id;
        }
      } else if (this.associations[name].type === 'hasMany') {
        var ids = this[name].map(function (x) {
          return x.id;
        }).compact();
        if (ids.length) {
          attrs[name] = ids;
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
    var _this11 = this;

    if ((typeof errors === "undefined" ? "undefined" : _typeof(errors)) === 'object') {
      var _loop6 = function _loop6(k) {
        if (Array.isArray(errors[k])) {
          errors[k].forEach(function (error) {
            this.addError(k, error);
          }, _this11);
        } else {
          _this11.addError(k, String(errors[k]));
        }
      };

      for (var k in errors) {
        _loop6(k);
      }
    } else {
      this.addError('base', String(errors));
    }

    return this;
  };

  // Internal: Clears validation errors from the `errors` hash. If a name is given, only the errors
  // for the property of that name are cleared, otherwise all errors are cleared.
  this.prototype._clearErrors = function (name) {
    if (name) {
      if (name in this.ownErrors) {
        delete this.ownErrors[name];
        this.didChange('ownErrors');
      }
    } else if (Object.keys(this.ownErrors).length) {
      this.__ownErrors = {};
      this.didChange('ownErrors');
    }
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
      throw new Error(this.constructor + "#inverseRemoved: unknown association `" + name + "`");
    }

    if (desc.type === 'hasOne') {
      hasOneSet.call(this, desc, undefined, false);
      this.didChange(desc.name);
    } else if (desc.type === 'hasMany') {
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
      throw new Error(this.constructor + "#inverseAdded: unknown association `" + name + "`");
    }

    if (desc.type === 'hasOne') {
      hasOneSet.call(this, desc, model, false);
      this.didChange(desc.name);
    } else if (desc.type === 'hasMany') {
      this[desc.name]._inverseAdd(model);
    }
  };

  // Internal: Overrides `Transis.Object#_setProp` in order to perform change tracking.
  this.prototype._setProp = function (name, value) {
    var oldValue = Model.__super__._setProp.call(this, name, value);

    if (!this.__props__[name].attr && !this.associations[name]) {
      return;
    }
    if (this.associations[name] && !this.associations[name].owner) {
      return;
    }

    if (!(name in this.ownChanges)) {
      if (!util.eq(this[name], oldValue)) {
        this._setChange(name, oldValue);
      }
    } else if (util.eq(this[name], this.ownChanges[name])) {
      this._clearChange(name);
    }
  };

  // Internal: Sets the old value for the changed property of the given name.
  this.prototype._setChange = function (name, oldValue) {
    if (loads.length) {
      return;
    }
    this.ownChanges[name] = oldValue;
    this.didChange('ownChanges');
  };

  // Internal: Clears the change record for the property of the given name.
  this.prototype._clearChange = function (name) {
    if (name in this.ownChanges) {
      delete this.ownChanges[name];
      this.didChange('ownChanges');
    }
  };

  // Internal: Clears all change records.
  this.prototype._clearChanges = function () {
    if (Object.keys(this.ownChanges).length) {
      this.__ownChanges = {};
      this.didChange('ownChanges');
    }
  };
});

Model.NEW = NEW;
Model.EMPTY = EMPTY;
Model.LOADED = LOADED;
Model.DELETED = DELETED;

Object.assign(Model, _validations2.default.static);
Object.assign(Model.prototype, _validations2.default.instance);

exports.default = Model;
module.exports = exports["default"];
