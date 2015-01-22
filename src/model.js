import pluralize from "pluralize";
import IdMap from "./id_map";
import RynoObject from "./object";
import RynoArray from "./array";
import QueryArray from "./query_array";
import HasManyArray from "./has_many_array";
import * as attrs from "./attrs";

var registeredClasses = {}, registeredAttrs = {};

const NEW     = 'new';
const EMPTY   = 'empty';
const LOADED  = 'loaded';
const DELETED = 'deleted';

// Internal: Resolves the given class name from the classes registered via `Model.register`.
//
// name - A string representing the name of a model class.
//
// Returns the resolved class constructor function.
// Throws `Error` if a class with the given name is not registered.
function resolveClass(name) {
  var klass = (typeof name === 'function') ? name : registeredClasses[name];

  if (!klass) {
    throw new Error(`Ryno.Model.resolveClass: could not resolve model class: \`${name}\``);
  }

  return klass;
}

// Internal: Checks to make sure the given object is of the type specified in the given association
// descriptor.
//
// Returns nothing.
// Throws `Error` if the given object isn't of the type specified in the association descriptor.
function checkAssociatedType(desc, o) {
  var klass = resolveClass(desc.klass);

  if (!(o instanceof klass)) {
    throw new Error(`${this.constructor}#${desc.name}: expected an object of type \`${desc.klass}\` but received \`${o}\` instead`);
  }
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
  var name  = desc.name,
      k     = `__${name}`,
      prev  = this[k],
      inv   = desc.inverse,
      klass = resolveClass(desc.klass);

  if (v && !(v instanceof klass)) {
    throw new Error(`${this.constructor}#${desc.name}: expected an object of type \`${klass}\` but received \`${v}\` instead`);
  }

  this[k] = v;

  if (sync && inv && prev) { prev._inverseRemoved(inv, this); }
  if (sync && inv && v) { v._inverseAdded(inv, this); }
}

// Internal: Callback for a successful model deletion. Updates the model's state, removes it from
// the identity map, and removes removes it from any associations its currently participating in.
function mapperDeleteSuccess() {
  IdMap.delete(this);
  this.__isBusy__ = false;
  this.__sourceState__ = DELETED;
  delete this.__error__;

  for (let name in this.associations) {
    let desc = this.associations[name];
    if (!desc.inverse) { continue; }
    if (desc.type === 'hasOne') {
      let m;
      if (m = this[name]) {
        m._inverseRemoved(desc.inverse, this);
      }
    }
    else if (desc.type === 'hasMany') {
      this[name].slice(0).forEach((m) => {
        m._inverseRemoved(desc.inverse, this);
      });
    }
  }
}

// Internal: Capitalizes the given word.
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

class Model extends RynoObject {
  // Public: Registers the `Model` subclass using the given name. Model subclasses must be
  // registered when they are referenced as a string in either a `hasOne` or `hasMany` association.
  //
  // name - A string. This string can be used to reference the model class in associations.
  //
  // Returns the receiver.
  static register(name = this.name) {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error(`Ryno.Model.register: no name given for class: \`${this}\``);
    }

    if (name in registeredClasses && registeredClasses[name] !== this) {
      throw new Error(`Ryno.Model.register: a class with name \`${name}\` has already been registered`);
    }

    registeredClasses[name] = this;
    this.displayName = name;

    return this;
  }

  // Public: Returns a string containing the class's name.
  static toString() {
    if (this.hasOwnProperty('displayName')) { return this.displayName; }
    if (this.hasOwnProperty('name')) { return this.name; }
    else { return '(Unknown)'; }
  }

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
  static empty(id) {
    var model = new this({id: id});
    model.__sourceState__ = EMPTY;
    return model;
  }

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
  static registerAttr(name, converter) {
    if (registeredAttrs[name]) {
      throw new Error(`${this}.registerAttr: an attribute with the name \`${name}\` has already been defined`);
    }

    registeredAttrs[name] = converter;

    return this;
  }

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
  static attr(name, type, opts = {}) {
    var converter = registeredAttrs[type];

    if (!converter) {
      throw new Error(`${this}.attr: unknown attribute type: \`${type}\``);
    }

    if (typeof converter === 'function') { converter = new converter(opts); }

    this.prop(name, {
      get: function() { return this.attrs[name]; },
      set: function(v) {
        this.attrs[name] = converter.coerce(v);
        this[`${name}BeforeCoercion`] = v;
      },
      default: 'default' in opts ? opts.default : undefined
    });

    return this;
  }

  // Public: Defines a `hasOne` association on the receiver class. This method will generate a
  // property with the given name that can be used to get or set the associated model.
  //
  // name  - A string representing the name of the association.
  // klass - Either the constructor function of the associated model or a string containing the name
  //         of the associated constructor function. Passing a string here is useful for the case
  //         where you are defining an association where the associated constructor function has yet
  //         to be defined. In order for this to work, the associated model class must be registered
  //         with the given name using `Model.register`.
  // opts  - An object containing zero or more of the following keys (default: `{}`):
  //   inverse - Used for establishing two way associations, this is the name of the property on the
  //             associated object that points back to the receiver class.
  //
  // Returns the receiver.
  static hasOne(name, klass, opts = {}) {
    var desc;

    if (!this.prototype.hasOwnProperty('associations')) {
      this.prototype.associations = Object.create(this.prototype.associations);
    }

    this.prototype.associations[name] = desc = Object.assign({}, opts, {
      type: 'hasOne', name, klass
    });

    Object.defineProperty(this.prototype, name, {
      get: function() { return this[`__${name}`]; },
      set: function(v) { hasOneSet.call(this, desc, v, true); }
    });

    return this;
  }

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
  //         to be defined. In order for this to work, the associated model class must be registered
  //         with the given name using `Model.register`.
  // opts  - (see hasOne description)
  //
  // Returns the receiver.
  static hasMany(name, klass, opts = {}) {
    var cap = capitalize(name), k = `__${name}`, desc;

    if (!this.prototype.hasOwnProperty('associations')) {
      this.prototype.associations = Object.create(this.prototype.associations);
    }

    this.prototype.associations[name] = desc = Object.assign({}, opts, {
      type: 'hasMany', name, klass, singular: pluralize(name, 1)
    });

    this.prop(name, {
      get: function() {
        if (this[k]) { return this[k]; }
        desc.klass = resolveClass(desc.klass);
        return this[k] = new HasManyArray(this, desc);
      },
      set: function(a) { this[k].replace(a); }
    });
  }

  // Public: Loads the given model attributes into the identity map. This method should be called by
  // your data mapper(s) when new data is successfully retrieved.
  //
  // attrs - An object containing the attributes for a single model. If the attributes contain
  //         references to defined associations, those associated objects will be loaded as well.
  //
  // Returns the loaded model instance.
  // Throws `Error` if the given attributes do not contain an `id` attribute.
  static load(attrs) {
    var id = attrs.id, associations = this.prototype.associations, associated = {}, model;

    if (!id) {
      throw new Error(`${this}.load: an \`id\` attribute is required`);
    }

    attrs = Object.assign({}, attrs);
    model = IdMap.get(this, id) || new this;
    delete attrs.id;

    // extract associated attributes
    for (let name in associations) {
      let desc = associations[name];

      if (name in attrs) {
        associated[name] = attrs[name]
        delete attrs[name];
      }
      else if (desc.type === 'hasOne' && `${name}Id` in attrs) {
        associated[name] = attrs[`${name}Id`];
        delete attrs[`${name}Id`];
      }
      else if (desc.type === 'hasOne' && `${name}_id` in attrs) {
        associated[name] = attrs[`${name}_id`];
        delete attrs[`${name}_id`];
      }
      else if (desc.type === 'hasMany' && `${desc.singular}Ids` in attrs) {
        associated[name] = attrs[`${desc.singular}Ids`];
        delete attrs[`${desc.singular}Ids`];
      }
      else if (desc.type === 'hasMany' && `${desc.singular}_ids` in attrs) {
        associated[name] = attrs[`${desc.singular}_ids`];
        delete attrs[`${desc.singular}_ids`];
      }
    }

    // set non-association attributes
    for (let k in attrs) {
      if (k in model) { model[k] = attrs[k]; }
    }

    // set id if necessary
    if (model.id === undefined) { model.id = id; }

    // load and set each association
    for (let name in associated) {
      let klass = resolveClass(associations[name].klass);
      let data = associated[name];

      if (!data) { continue; }

      if (associations[name].type === 'hasOne') {
        let other = typeof data === 'object' ? klass.load(data) : klass.local(data);
        model[name] = other;
      }
      else if (associations[name].type === 'hasMany') {
        let others = [];
        data.forEach((o) => {
          others.push(typeof o === 'object' ? klass.load(o) : klass.local(o));
        });
        model[name] = others;
      }
    }

    model.__sourceState__ = LOADED;

    return model;
  }

  // Public: Loads an array of attribute objects.
  //
  // objects - An array containing attribute hashes.
  //
  // Returns an array of loaded model instances.
  static loadAll(objects) { return objects.map((object) => this.load(object)); }

  // Public: Creates a new `Ryno.QueryArray` but does not invoke its `query` method. This is useful
  // for cases where you want to initialize an empty query, but not yet run it.
  //
  // Returns a new `Ryno.QueryArray`.
  static buildQuery() { return new QueryArray(this); }

  // Public: Creates a new `Ryno.QueryArray` and invokes its `query` method with the given options.
  //
  // opts - An options object to pass to the `Ryno.QueryArray#query` method (default: `{}`).
  //
  // Returns a new `Ryno.QueryArray`.
  static query(opts = {}) { return this.buildQuery().query(opts); }

  // Public: Retrieves a model from the identity map or creates a new empty model instance. If you
  // want to get the model from the mapper, then use the `Model.get` method.
  //
  // id - The id of the model to get.
  //
  // Returns an instance of the receiver.
  static local(id) { return IdMap.get(this, id) || this.empty(id); }

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
  static get(id, opts = {}) {
    var model = this.local(id), getOpts = Object.assign({}, opts);
    delete getOpts.refresh;

    if (model.isEmpty || opts.refresh) {
      model.__isBusy__ = true;
      model.__promise__ = this._callMapper('get', [id, getOpts])
        .then((result) => {
          model.__isBusy__ = false;
          delete model.__error__;
          this.load(result);
        }, (error) => {
          model.__isBusy__ = false;
          model.__error__ = error;
          throw error;
        });
    }

    return model;
  }

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
  static _callMapper(method, args) {
    var promise;

    if (!this.mapper) {
      throw new Error(`${this}._callMapper: no mapper defined, assign one to \`${this}.mapper\``);
    }

    if (typeof this.mapper[method] !== 'function') {
      throw new Error(`${this}._callMapper: mapper does not implement \`${method}\``);
    }

    promise = this.mapper[method].apply(this.mapper, args);

    if (!promise || typeof promise.then !== 'function') {
      throw new Error(`${this}._callMapper: mapper's \`${method}\` method did not return a Promise`);
    }

    return promise;
  }

  constructor(attrs) {
    this.attrs           = {};
    this.__sourceState__ = NEW;
    this.__isBusy__      = false;
    this.__promise__     = Promise.resolve();

    super(attrs);
  }

  get id() { return this.__id__; }
  set id(id) {
    if (this.__id__) {
      throw new Error(`${this.constructor}#id=: overwriting a model's identity is not allowed: ${this}`);
    }

    this.__id__ = id;

    IdMap.insert(this);
  }

  get sourceState() { return this.__sourceState__; }
  get isNew() { return this.sourceState === NEW; }
  get isEmpty() { return this.sourceState === EMPTY; }
  get isLoaded() { return this.sourceState === LOADED; }
  get isDeleted() { return this.sourceState === DELETED; }
  get isBusy() { return this.__isBusy__; }
  get error() { return this.__error__; }

  // Public: Refreshes the model by getting it from the data mapper.
  //
  // opts - An object to forward along to the mapper (default: `{}`).
  //
  // Returns the receiver.
  // Throws `Error` if the receiver is not LOADED or is BUSY.
  get(opts = {}) {
    if ((!this.isLoaded && !this.isEmpty) || this.isBusy) {
      throw new Error(`${this.constructor}#get: can't get a model in the ${this.stateString()} state: ${this}`);
    }

    return this.constructor.get(this.id, Object.assign({}, opts, {refresh: true}));
  }

  // Public: Saves the model by invoking either the `create` or `update` method on the model's data
  // mapper. The `create` method is invoked if the model is in the `NEW` state and `create`
  // otherwise.
  //
  // opts - An object to forward on to the mapper (default: `{}`).
  //
  // Returns the receiver.
  // Throws `Error` if the receiver is not NEW or LOADED or is currently busy.
  save(opts = {}) {
    if ((!this.isNew && !this.isLoaded) || this.isBusy) {
      throw new Error(`${this.constructor}#save: can't save a model in the ${this.stateString()} state: ${this}`);
    }

    this.__isBusy__ = true;

    this.__promise__ = this.constructor._callMapper(this.isNew ? 'create' : 'update', [this, opts])
      .then((attrs) => {
        this.__isBusy__ = false;
        delete this.__error__;
        this.load(attrs);
      }, (error) => {
        this.__isBusy__ = false;
        this.__error__ = error;
      });

    return this;
  }

  // Public: Deletes the model by passing it to the data mapper's `delete` method.
  //
  // opts - An object to forward on to the mapper (default: `{}`).
  //
  // Returns the receiver.
  // Throws `Error` if the model is currently busy.
  delete(opts = {}) {
    if (this.isDeleted) { return this; }

    if (this.isBusy) {
      throw new Error(`${this.constructor}#delete: can't delete a model in the ${this.stateString()} state: ${this}`);
    }

    if (this.isNew) {
      mapperDeleteSuccess.call(this);
    }
    else {
      this.__isBusy__ = true;

      this.__promise__ = this.constructor._callMapper('delete', [this, opts])
        .then(() => {
          mapperDeleteSuccess.call(this);
        }, (error) => {
          this.__isBusy__ = false;
          this.__error__ = error;
        });
    }

    return this;
  }

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
  then(onFulfilled, onRejected) { return this.__promise__.then(onFulfilled, onRejected); }

  // Public: Registers a rejection handler on the latest promise object returned by the model's
  // mapper.
  //
  // onRejected  - A function to be invoked when the latest promise from the mapper is rejected.
  //
  // Returns a new `Promise` that is resolved to the return value of the callback if it is called.
  catch(onRejected) { return this.__promise__.catch(onRejected); }

  // Public: Loads the given attributes into the model. This method simply ensure's that the
  // receiver has its `id` set and then delegates to `Model.load`.
  //
  // Returns the receiver.
  load(attrs) {
    var id = attrs.id;

    if (id == null && this.id == null) {
      throw new Error(`${this.constructor}#load: an \`id\` attribute is required`);
    }

    if (id != null && this.id != null && id !== this.id) {
      throw new Error(`${this.constructor}#load: received attributes with id \`${id}\` but model already has id \`${this.id}\``);
    }

    if (this.id == null) { this.id = id; }

    attrs.id = this.id;
    this.constructor.load(attrs);

    return this;
  }

  // Public: Returns a string representation of the model's current state.
  stateString() {
    var a = [this.sourceState.toUpperCase()];
    if (this.isBusy) { a.push('BUSY'); }
    return a.join('-');
  }

  toString() {
    return `#<${this.constructor} (${this.stateString()}):${this.id}>`;
  }

  // Internal: Called by an inverse association when a model was removed from the inverse side.
  // Updates the local side of the association.
  //
  // name  - The local side name of the association that was modified.
  // model - The model that was removed from the inverse side.
  //
  // Returns nothing.
  _inverseRemoved(name, model) {
    var desc = this.associations[name];

    if (!desc) {
      throw new Error(`${this.constructor}#inverseRemoved: unknown association \`${name}\``);
    }

    if (desc.type === 'hasOne') {
      hasOneSet.call(this, desc, undefined, false);
    }
    else if (desc.type === 'hasMany') {
      this[desc.name]._inverseRemove(model);
    }
  }

  // Internal: Called by an inverse association when a model was added on the inverse side. Updates
  // the local side of the association.
  //
  // name  - The local side name of the association that was modified.
  // model - The model that was added on the inverse side.
  //
  // Returns nothing.
  _inverseAdded(name, model) {
    var desc = this.associations[name];

    if (!desc) {
      throw new Error(`${this.constructor}#inverseAdded: unknown association \`${name}\``);
    }

    if (desc.type === 'hasOne') {
      hasOneSet.call(this, desc, model, false);
    }
    else if (desc.type === 'hasMany') {
      this[desc.name]._inverseAdd(model);
    }
  }
}

Model.prototype.associations = {};

Model.displayName = 'Ryno.Model';

Model.NEW     = NEW;
Model.EMPTY   = EMPTY;
Model.LOADED  = LOADED;
Model.DELETED = DELETED;

Model.registerAttr('identity', attrs.IdentityAttr);
Model.registerAttr('string', attrs.StringAttr);
Model.registerAttr('number', attrs.NumberAttr);
Model.registerAttr('boolean', attrs.BooleanAttr);
Model.registerAttr('date', attrs.DateAttr);
Model.registerAttr('datetime', attrs.DateTimeAttr);

export default Model;
