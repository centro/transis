import Emitter from "./emitter";

var objectId = 0, subclasses = {};

function BasisObject() {
  Object.defineProperty(this, 'objectId', {value: ++objectId});
  this.init.apply(this, arguments);
};

// Internal: Caches the given name/value pair on the receiver.
function cache(name, value) { (this.__cache__ = this.__cache__ || {})[name] = value; }

// Internal: Removes the given name from the cache.
function uncache(name) { if (this.__cache__) { delete this.__cache__[name]; } }

// Internal: Indicates whether the current name has a value cached.
function isCached(name) { return this.__cache__ ? this.__cache__.hasOwnProperty(name) : false; }

// Internal: Returns the cached value for the given name.
function getCached(name) { return this.__cache__ ? this.__cache__[name] : undefined; }

// Internal: Dependent event observer. Clears cached values and emits change events for the
// the property whose dependency was changed.
function onDependentEvent(event, data, desc) {
  uncache.call(this, desc.name);
  this.emit(`change:${desc.name}`, {object: this});
}

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
// name - A string representing the name of a `Basis.Object` subclass.
//
// Returns the resolved subclass constructor function.
// Throws `Error` if a class with the given name is not known.
BasisObject.resolve = function(name) {
  var klass = (typeof name === 'function') ? name : subclasses[name];

  if (!klass) {
    throw new Error(`Basis.Object.resolve: could not resolve subclass: \`${name}\``);
  }

  return klass;
};

// Public: Defines a property on the class's prototype. Properties defined with this method are
// observable using the `Basis.Object#on` method. When changed, they emit `change:<name>` events.
// The object being changed and the old value of the property are passed along in the event.
//
// name - A string containing the name of the property.
// opts - An object containing one or more of the following keys:
//   get       - A custom property getter function.
//   set       - A custom property setter function.
//   readonly  - Makes the property readonly. Should only be used with the `get` option.
//   default   - Specify a default value for the property.
//   changesOn - An array of event names that when observed, cause the property to change. This
//               should be used with custom `get` functions in order to make the property
//               observable.
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
    changesOn: [],
    cache: false
  }, opts);

  if (descriptor.cache && !descriptor.changesOn.length) {
    console.warn(`Basis.Object.prop: cached property \`${name}\` does not have any dependencies (use the \`changesOn\` option)`);
  }

  if (!this.prototype.hasOwnProperty('__props__')) {
    this.prototype.__props__ = Object.create(this.prototype.__props__ || null);
  }

  this.prototype.__props__[name] = descriptor;

  Object.defineProperty(this.prototype, name, {
    get: function() { return this.getProp(name); },
    set: descriptor.readonly ? undefined : function(value) { this.setProp(name, value); },
    configurable: false,
    enumerable: true
  });

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

  for (let k in this.__props__) {
    this.__props__[k].changesOn.forEach((event) => {
      this.on(event, onDependentEvent, {context: this.__props__[k]})
    });
  }

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
BasisObject.prototype.getProp = function(name) {
  var descriptor = this.__props__ && this.__props__[name], key = `__${name}`, value;

  if (!descriptor) {
    throw new Error(`Basis.Object#getProp: unknown prop name \`${name}\``);
  }

  if (descriptor.cache && isCached.call(this, name)) { return getCached.call(this, name); }

  value = descriptor.get ? descriptor.get.call(this) : this[key];
  value = (value === undefined) ? descriptor.default : value;

  if (descriptor.cache) { cache.call(this, name, value); }

  return value;
};

// Internal: Sets the value of the given property and emits a `change:<name>` event.
//
// Returns nothing.
// Throws `Error` if there is no property with the given name.
// Throws `TypeError` if the property is readonly.
BasisObject.prototype.setProp = function(name, value) {
  var descriptor = this.__props__ && this.__props__[name],
      key        = `__${name}`,
      old        = this.getProp(name);

  if (!descriptor) {
    throw new Error(`Basis.Object#setProp: unknown prop name \`${name}\``);
  }

  if (descriptor.readonly) {
    throw new TypeError(`Basis.Object#setProp: cannot set readonly property \`${name}\` of ${this}`);
  }

  if (descriptor.set) { descriptor.set.call(this, value); }
  else { this[key] = value; }

  this.emit(`change:${name}`, {object: this, old});
};

BasisObject.displayName = 'Basis.Object';

Object.assign(BasisObject.prototype, Emitter);

export default BasisObject;
