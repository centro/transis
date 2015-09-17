import * as util from "./util";

var objectId = 0, changedObjects = {}, delayCallbacks = [], flushTimer;

function BasisObject() {
  Object.defineProperty(this, 'objectId', {value: ++objectId});
  this.init.apply(this, arguments);
};

BasisObject.displayName = 'Basis.Object';

// Internal: Processes a property change by traversing the property dependency graph and forwarding
// changes to proxy objects.
function didChange(object, name) {
  (object.__changedProps__ = object.__changedProps__ || {})[name] = true;
  changedObjects[object.objectId] = object;
  uncache.call(object, name);

  if (object.__deps__) {
    let deps = object.__deps__[name];

    if (deps) {
      for (let i = 0, n = deps.length; i < n; i++) {
        didChange(object, deps[i]);
      }
    }
  }

  if (object.__proxies__ && name.indexOf('.') === -1) {
    for (let k in object.__proxies__) {
      util.detectRecursion(object, function() {
        didChange(object.__proxies__[k].object, `${object.__proxies__[k].name}.${name}`);
      });
    }
  }
}

// Internal: Flushes the current change queue. This notifies observers of the changed props as well
// as observers of any props that depend on the changed props. Observers are only invoked once per
// flush, regardless of how many of their dependent props have changed. Additionaly, cached values
// are cleared where appropriate.
function flush() {
  var ids = Object.keys(changedObjects), f;

  for (let j = 0, m = ids.length; j < m; j++) {
    let object  = changedObjects[ids[j]];
    let changes = Object.keys(object.__changedProps__);

    for (let i = 0, n = changes.length; i < n; i++) {
      didChange(object, changes[i]);
    }
  }

  for (let id in changedObjects) {
    let object  = changedObjects[id];
    let changes = Object.keys(object.__changedProps__);
    let star    = false;

    object.__changedProps__ = {};

    for (let i = 0, n = changes.length; i < n; i++) {
      if (changes[i].indexOf('.') === -1) { star = true; }
      object.notify(changes[i]);
    }

    if (star) { object.notify('*'); }
  }

  changedObjects = {};

  flushTimer = null;

  while (f = delayCallbacks.shift()) { f(); }
}

// Internal: Caches the given name/value pair on the receiver.
function cache(name, value) { (this.__cache__ = this.__cache__ || {})[name] = value; }

// Internal: Removes the given name from the cache.
function uncache(name) { if (this.__cache__) { delete this.__cache__[name]; } }

// Internal: Indicates whether the current name has a value cached.
function isCached(name) { return this.__cache__ ? this.__cache__.hasOwnProperty(name) : false; }

// Internal: Returns the cached value for the given name.
function getCached(name) { return this.__cache__ ? this.__cache__[name] : undefined; }

// Internal: Defines a property on the given object. See the docs for `Basis.prop`.
//
// Returns nothing.
function defineProp(object, name, opts = {}) {
  var descriptor = Object.assign({
    name: name,
    get: null,
    set: null,
    default: undefined,
    on: [],
    cache: false,
    pure: !!(opts.get && opts.on && !opts.set),
  }, opts, {readonly: opts.get && !opts.set});

  if (!object.hasOwnProperty('__props__')) {
    object.__props__ = Object.create(object.__props__ || null);
  }

  object.__props__[name] = descriptor;

  if (!object.hasOwnProperty('__deps__')) {
    object.__deps__ = Object.create(object.__deps__ || null);
  }

  descriptor.on.forEach(function(prop) {
    (object.__deps__[prop] = object.__deps__[prop] || []).push(name);

    if (prop.indexOf('.') !== -1) {
      let segments = prop.split('.'), first = segments[0];
      if (segments.length > 2) {
        throw new Error(`Basis.Object.defineProp: dependent property paths of more than two segments are not allowed: \`${prop}\``);
      }
      (object.__deps__[first] = object.__deps__[first] || []).push(name);
    }
  });

  Object.defineProperty(object, name, {
    get: function() { return this._getProp(name); },
    set: descriptor.readonly ? undefined : function(value) { this._setProp(name, value); },
    configurable: false,
    enumerable: true
  });
}

// Public: Flush the pending change queue. This should only be used in specs.
BasisObject.flush = function() {
  clearTimeout(flushTimer);
  flush();
  return this;
};

// Public: Register a callback to be invoked immediately after the next flush cycle completes.
//
// f - A function.
//
// Returns the receiver;
BasisObject.delay = function(f) {
  delayCallbacks.push(f);
  return this;
};

// Public: Creates a subclass of `Basis.Object`.
BasisObject.extend = function(f) {
  var subclass = function() { BasisObject.apply(this, arguments); };

  for (let k in this) { if (this.hasOwnProperty(k)) { subclass[k] = this[k]; } }

  subclass.prototype = Object.create(this.prototype);
  subclass.prototype.constructor = subclass;
  subclass.__super__ = this.prototype;

  if (typeof f === 'function') { f.call(subclass); }

  return subclass;
};

// Public: Defines a property on the class's prototype. Properties defined with this method are
// observable using the `Basis.Object#on` method.
//
// name - A string containing the name of the property.
// opts - An object containing one or more of the following keys:
//   get       - A custom property getter function.
//   set       - A custom property setter function.
//   default   - Specify a default value for the property.
//   on        - An array of dependent path names. Observers of the prop are notified when any of
//               these props change. Paths may be at most two segments long.
//   pure      - Boolean indicating whether the computed prop's `get` function is pure or not. When
//               accessed, a pure prop's `get` function has its dependencies passed in and is called
//               with `this` set to null. If you have a computed prop with dependencies and need to
//               access `this`, then `pure` must be set to `false`.
//   cache     - Set this to true to enable property caching. This is useful with computed
//               properties that have their dependent events defined. If dependent events aren't
//               defined, then the initially cached value will never be cleared.
//
// Returns the receiver.
BasisObject.prop = function(name, opts = {}) {
  defineProp(this.prototype, name, opts);
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
BasisObject.prototype.init = function(props) { if (props) { this.set(props); } };

// Public: Defines an observable property directly on the receiver. See the `Basis.Object.prop`
// method for available options.
BasisObject.prototype.prop = function(name, opts = {}) {
  defineProp(this, name, opts);
  return this;
};

// Public: Creates multiple props at once from the given object directly on the receiver.
BasisObject.prototype.props = BasisObject.props;

// Public: Set multiple props at once. This method take special care to only set props that are
// defined with `Basis.Object.prop` and are not readonly.
//
// props - An object containing props to set.
//
// Returns nothing.
BasisObject.prototype.set = function(props) {
  for (let k in props) {
    if (this.__props__ && this.__props__[k] && !this.__props__[k].readonly) {
      this[k] = props[k];
    }
  }
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

// Public: Notifies observers of an event. Observers are invoked with the name of the event and
// any additional arguments passed to `notify`.
//
// event   - A string containing the name of the event.
// ...args - Zero or more additional arguments to pass along to observers.
//
// Returns the receiver.
BasisObject.prototype.notify = function(event, ...args) {
  if (this.__observers__ && this.__observers__[event]) {
    for (let i = 0, n = this.__observers__[event].length; i < n; i++) {
      if (this.__observers__[event][i]) {
        try {
          this.__observers__[event][i](event, ...args);
        }
        catch (e) {
          console.error('Basis.Object#notify: exception caught in observer:', e);
        }
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

  // FIXME: The double setTimeout here is to work around an issue we've been seeing in Firefox
  // with promises. In Chrome the flush is getting run after promises callbacks are invoked but
  // in firefox its running before which is causing some timing issues. The double setTimeout
  // ensures that the flush gets run after promise callbacks.
  if (!flushTimer) { flushTimer = setTimeout(function() { setTimeout(flush); }); }

  return this;
};

// Public: Returns a string representation of the object.
BasisObject.prototype.toString = function() {
  return `#<${this.constructor}:${this.objectId}>`;
};

// Public: Indicates whether the receiver is equal to the given object. The default implementation
// simply does an identity comparison using the `===` operator. You'll likely want to override
// this method in your sub-types in order to perform a more meaningful comparison.
//
// o - An object to compare against the receiver.
//
// Returns a `true` if the objects are equal and `false` otherwise.
BasisObject.prototype.eq = function(other) { return this === other; };

// Public: Resolves the given path into a value, relative to the receiver. See `util.getPath`.
BasisObject.prototype.getPath = function(path) { return util.getPath(this, path); };

// Internal: Returns the current value of the given property or the default value if it is not
// defined.
//
// Returns the value of the property.
// Throws `Error` if there is no property with the given name.
BasisObject.prototype._getProp = function(name) {
  var desc = this.__props__ && this.__props__[name], value;

  if (!desc) {
    throw new Error(`Basis.Object#_getProp: unknown prop name \`${name}\``);
  }

  if (desc.cache && isCached.call(this, name)) { return getCached.call(this, name); }

  if (desc.get && desc.pure) {
    value = desc.get.apply(null, desc.on.map((path) => this.getPath(path)));
  }
  else if (desc.get) {
    value = desc.get.call(this);
  }
  else {
    value = this[`__${name}`];
  }

  value = (value === undefined) ? desc.default : value;

  if (desc.cache) { cache.call(this, name, value); }

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

  this.didChange(name);

  return old;
};

// Internal: Registers a proxy object. All prop changes on the receiver will be proxied to the
// given proxy object with the given name as a prefix for the property name.
BasisObject.prototype._registerProxy = function(object, name) {
  this.__proxies__ = this.__proxies__ || {};
  this.__proxies__[`${object.objectId},${name}`] = {object, name};
  return this;
};

// Internal: Deregisters a proxy object previously registered with `#_registerProxy`.
BasisObject.prototype._deregisterProxy = function(object, name) {
  if (this.__proxies__) { delete this.__proxies__[`${object.objectId},${name}`]; }
  return this;
};

BasisObject.displayName = 'Basis.Object';

export default BasisObject;
