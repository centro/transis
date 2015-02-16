var objectId = 0, subclasses = {}, changedObjects = {}, flushTimer;

function BasisObject() {
  Object.defineProperty(this, 'objectId', {value: ++objectId});
  this.init.apply(this, arguments);
};

// Internal: Flushes the current change queue. This notifies observers of the changed props as well
// as observers of any props that depend on the changed props. Observers are only invoked once per
// flush, regardless of how many of their dependent props have changed. Additionaly, cached values
// are cleared where appropriate.
function flush() {
  flushTimer = null;

  for (let id in changedObjects) {
    let object    = changedObjects[id];
    let deps      = object.__deps__;
    let changes   = Object.keys(object.__changedProps__);
    let processed = {};

    delete changedObjects[id];
    delete object.__changedProps__;

    while (changes.length) {
      let prop = changes.shift();

      if (processed[prop]) { continue; }
      processed[prop] = true;

      if (deps[prop]) {
        for (let i = 0, n = deps[prop].length; i < n; i++) {
          changes.push(deps[prop][i]);
        }
      }

      uncache.call(object, prop);

      if (object.__observers__ && object.__observers__[prop]) {
        for (let i = 0, n = object.__observers__[prop].length; i < n; i++) {
          object.__observers__[prop][i]();
        }
      }
    }

    if (object.__observers__ && object.__observers__['*']) {
      for (let i = 0, n = object.__observers__['*'].length; i < n; i++) {
        object.__observers__['*'][i]();
      }
    }
  }
}

// Internal: Caches the given name/value pair on the receiver.
function cache(name, value) { (this.__cache__ = this.__cache__ || {})[name] = value; }

// Internal: Removes the given name from the cache.
function uncache(name) { if (this.__cache__) { delete this.__cache__[name]; } }

// Internal: Indicates whether the current name has a value cached.
function isCached(name) { return this.__cache__ ? this.__cache__.hasOwnProperty(name) : false; }

// Internal: Returns the cached value for the given name.
function getCached(name) { return this.__cache__ ? this.__cache__[name] : undefined; }

// Public: Flush the pending change queue. This should only be used in specs.
BasisObject.flush = function() {
  clearTimeout(flushTimer);
  flush();
  return this;
};

// Public: Creates a subclass of `Basis.Object`.
BasisObject.extend = function(name, f) {
  if (typeof name !== 'string') {
    throw new Error(`${this}.extend: a name is required`);
  }

  var subclass = function() { BasisObject.apply(this, arguments); };

  for (let k in this) { if (this.hasOwnProperty(k)) { subclass[k] = this[k]; } }

  subclass.displayName = name;
  subclass.prototype = Object.create(this.prototype);
  subclass.prototype.constructor = subclass;
  subclass.__super__ = this.prototype;

  if (typeof f === 'function') { f.call(subclass); }

  subclasses[name] = subclass;
  subclass.objectId = ++objectId;

  return subclass;
};

// Internal: Returns the `Basis.Object` subclass with the given name.
//
// name  - A string representing the name of a `Basis.Object` subclass.
// raise - A boolean indicating whether an exception should be raised if the name can't be resolved
//         (default: `true`).
//
// Returns the resolved subclass constructor function or `undefined` if a class with the given name
//   is not known.
// Throws `Error` if the `raise` argument is `true` and the name cannot not be resolved.
BasisObject.resolve = function(name, raise = true) {
  var klass = (typeof name === 'function') ? name : subclasses[name];

  if (!klass && raise) {
    throw new Error(`Basis.Object.resolve: could not resolve subclass: \`${name}\``);
  }

  return klass;
};

// Public: Defines a property on the class's prototype. Properties defined with this method are
// observable using the `Basis.Object#on` method.
//
// name - A string containing the name of the property.
// opts - An object containing one or more of the following keys:
//   get       - A custom property getter function.
//   set       - A custom property setter function.
//   readonly  - Makes the property readonly. Should only be used with the `get` option.
//   default   - Specify a default value for the property.
//   on        - An array of dependent prop names. Observers of the prop are notified when any of
//               these props change.
//   cache     - Set this to true to enable property caching. This is useful with computed
//               properties that have their dependent events defined. If dependent events aren't
//               defined, then the initially cached value will never be cleared.
//
// Returns the receiver.
BasisObject.prop = function(name, opts = {}) {
  var descriptor = Object.assign({
    name: name,
    get: null,
    set: null,
    readonly: false,
    default: undefined,
    on: [],
    cache: false
  }, opts);

  if (!this.prototype.hasOwnProperty('__props__')) {
    this.prototype.__props__ = Object.create(this.prototype.__props__ || null);
  }

  this.prototype.__props__[name] = descriptor;

  if (!this.prototype.hasOwnProperty('__deps__')) {
    this.prototype.__deps__ = Object.create(this.prototype.__deps__ || null);
  }

  descriptor.on.forEach(function(prop) {
    (this.prototype.__deps__[prop] = this.prototype.__deps__[prop] || []).push(name);
  }, this);

  Object.defineProperty(this.prototype, name, {
    get: function() { return this._getProp(name); },
    set: descriptor.readonly ? undefined : function(value) { this._setProp(name, value); },
    configurable: false,
    enumerable: true
  });

  return this;
};

// Public: Creates multiple props at once from the given object.
//
// props - An object mapping prop names to their options. See `Basis.Object#prop` for the available
//         options.
//
// Returns the receiver.
BasisObject.props = function(props) {
  for (let name in props) { this.prop(name, props[name]); }
  return this;
};

// Public: Returns a string containing the class's name.
BasisObject.toString = function() { return this.displayName || this.name || '(Unknown)'; };

// Public: The `Basis.Object` initializer. Sets the given props and begins observing dependent
// property events. This method should never be called directly, its called by the `Basis.Object`
// constructor function.
//
// props - An object containing properties to set. Only properties defined via `Basis.Object.prop`
//         are settable.
//
// Returns the receiver.
BasisObject.prototype.init = function(props = {}) {
  for (let k in props) { if (k in this) { this[k] = props[k]; } }

  return this;
};

// Public: Register a callback to be invoked when the given prop changes. Callbacks are invoked
// asynchronously whenever the property is changed directly or one of its dependent properties is
// changed.
//
// prop     - The name of the property to observe.
// callback - A function to invoke when the prop changes.
//
// Returns the receiver.
BasisObject.prototype.on = function(prop, callback) {
  this.__observers__ = this.__observers__ || {};
  this.__observers__[prop] = this.__observers__[prop] || [];
  this.__observers__[prop].push(callback);
  return this;
};

// Public: Remove a prop observer.
//
// prop     - The name of the property to stop observing.
// callback - The function passed to `Basis.Object#on`.
//
// Returns the receiver.
BasisObject.prototype.off = function(prop, callback) {
  if (this.__observers__ && this.__observers__[prop]) {
    for (let i = this.__observers__[prop].length - 1; i >= 0; i--) {
      if (this.__observers__[prop][i] === callback) {
        this.__observers__[prop].splice(i, 1);
      }
    }
  }
  return this;
};

// Public: Registers a property change and asynchronously triggers property observers. This is
// called automatically when a prop is set. This should only be used when the state of a prop is
// managed by external code.
//
// name - The name of the prop that has changed.
//
// Returns the receiver.
BasisObject.prototype.didChange = function(name) {
  (this.__changedProps__ = this.__changedProps__ || {})[name] = true;
  changedObjects[this.objectId] = this;
  if (!flushTimer) { flushTimer = setTimeout(flush); }
  return this;
};

// Public: Indicates whether the receiver is equal to the given object. The default implementation
// simply does an identity comparison using the `===` operator. You'll likely want to override
// this method in your sub-types in order to perform a more meaningful comparison.
//
// o - An object to compare against the receiver.
//
// Returns a `true` if the objects are equal and `false` otherwise.
BasisObject.prototype.eq = function(other) { return this === other; };

// Internal: Returns the current value of the given property or the default value if it is not
// defined.
//
// Returns the value of the property.
// Throws `Error` if there is no property with the given name.
BasisObject.prototype._getProp = function(name) {
  var descriptor = this.__props__ && this.__props__[name], key = `__${name}`, value;

  if (!descriptor) {
    throw new Error(`Basis.Object#_getProp: unknown prop name \`${name}\``);
  }

  if (descriptor.cache && isCached.call(this, name)) { return getCached.call(this, name); }

  value = descriptor.get ? descriptor.get.call(this) : this[key];
  value = (value === undefined) ? descriptor.default : value;

  if (descriptor.cache) { cache.call(this, name, value); }

  return value;
};

// Internal: Sets the value of the given property.
//
// name - The name of the prop to change.
// value - The new value of the prop.
//
// Returns the previous value.
// Throws `Error` if there is no property with the given name.
// Throws `TypeError` if the property is readonly.
BasisObject.prototype._setProp = function(name, value) {
  var descriptor = this.__props__ && this.__props__[name],
      key        = `__${name}`,
      old        = this._getProp(name);

  if (!descriptor) {
    throw new Error(`Basis.Object#_setProp: unknown prop name \`${name}\``);
  }

  if (descriptor.readonly) {
    throw new TypeError(`Basis.Object#_setProp: cannot set readonly property \`${name}\` of ${this}`);
  }

  if (descriptor.set) { descriptor.set.call(this, value); }
  else { this[key] = value; }

  this.didChange(name, {old});

  return old;
};

BasisObject.displayName = 'Basis.Object';

export default BasisObject;
