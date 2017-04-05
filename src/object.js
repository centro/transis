import * as util from "./util";

var objectId = 0, changedObjects = {}, delayPreFlushCallbacks = [], delayPostFlushCallbacks = [], flushTimer;

// Public: `Transis.Object` is the foundation of the `Transis` library. It implements a basic object
// system and observable properties.
//
// To create a subclass of `Transis.Object` use the `extend` method and pass it a function. Inside of
// the function is the "class body" where you can define both static and dynamic properties:
//
//   var Person = Transis.Object.extend(function() {
//     // `this` refers to `MyClass`
//
//     // define static/class properties by attaching them to `this`.
//     this.classMethod = function() {};
//
//     // create an intializer by defining the `init` method.
//     this.prototype.init = function(firstName, lastName) {
//       this.firstName = firstName;
//       this.lastName = lastName;
//     };
//
//     // define instance properties by adding them to the `prototype`
//     this.prototype.fullName = function() {
//       return this.firstName + ' ' + this.lastName;
//     };
//   });
//
//   Person.classMethod();
//
//   // instantiate an object using the `new` operator, any arguments will get passed to the `init`
//   // method
//   var joe = new Person('joe', 'blow');
//   joe.fullName(); // 'Joe Blow'
//
// See `Transis.Object.prop` for defining observable properties.
function TransisObject() {
  Object.defineProperty(this, 'objectId', {value: ++objectId});
  this.init.apply(this, arguments);
};

TransisObject.displayName = 'Transis.Object';

function registerChange(object, prop) {
  changedObjects[object.objectId] = changedObjects[object.objectId] || {object, props: {}};
  changedObjects[object.objectId].props[prop] = true;
}

// Internal: Processes recorded property changes by traversing the property dependency graph and
// forwarding changes to proxy objects.
function propagateChanges() {
  let seen = {};
  let head;

  for (let id in changedObjects) {
    let {object, props} = changedObjects[id];
    for (let k in props) {
      head = {object, name: k, next: head};
      seen[id + k] = true;
    }
  }

  while (head) {
    let {name, object, object: {objectId, __deps__, __proxies__}} = head;
    let deps = __deps__ && __deps__[name];

    head = head.next;

    registerChange(object, name);

    if (object.__cache__) { delete object.__cache__[name]; }

    if (deps) {
      for (let i = 0, n = deps.length; i < n; i++) {
        let seenKey = objectId + deps[i];

        if (!seen[seenKey]) {
          head = {object, name: deps[i], next: head};
          seen[seenKey] = true;
        }
      }
    }

    if (__proxies__ && name.indexOf('.') === -1) {
      for (let k in __proxies__) {
        let proxy = __proxies__[k];
        let proxyObject = proxy.object;
        let proxyName = `${proxy.name}.${name}`;
        let proxySeenKey = proxyObject.objectId + proxyName;

        if (!seen[proxySeenKey]) {
          head = {object: proxyObject, name: proxyName, next: head};
          seen[proxySeenKey] = true;
        }
      }
    }
  }
}

// Internal: Flushes the current change queue. This notifies observers of the changed props as well
// as observers of any props that depend on the changed props. Observers are only invoked once per
// flush, regardless of how many of their dependent props have changed. Additionaly, cached values
// are cleared where appropriate.
function flush() {
  let f;

  while ((f = delayPreFlushCallbacks.shift())) { f(); }

  propagateChanges();

  let curChangedObjects = changedObjects;
  changedObjects = {};
  flushTimer = null;

  for (let id in curChangedObjects) {
    let {object, props} = curChangedObjects[id];
    let star = false;

    for (let k in props) {
      if (k.indexOf('.') === -1) { star = true; }
      object.notify(k);
    }

    if (star) { object.notify('*'); }
  }

  while ((f = delayPostFlushCallbacks.shift())) { f(); }
}

// Internal: Indicates whether the current name has a value cached.
function isCached(name) { return this.__cache__ ? this.__cache__.hasOwnProperty(name) : false; }

// Internal: Returns the cached value for the given name.
function getCached(name) { return this.__cache__ ? this.__cache__[name] : undefined; }

// Internal: Defines a property on the given object. See the docs for `Transis.prop`.
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
        throw new Error(`Transis.Object.defineProp: dependent property paths of more than two segments are not allowed: \`${prop}\``);
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
TransisObject.flush = function() {
  clearTimeout(flushTimer);
  flush();
  return this;
};

// Public: Clears the pending change queue. This should only be used in specs.
TransisObject.clearChangeQueue = function() {
  clearTimeout(flushTimer);
  changedObjects = {};
  return this;
};

// Public: Register a callback to be invoked immediately before the next flush cycle begins.
//
// f - A function.
//
// Returns the receiver;
TransisObject.delayPreFlush = function(f) {
  delayPreFlushCallbacks.push(f);
  return this;
};

// Public: Register a callback to be invoked immediately after the next flush cycle completes.
//
// f - A function.
//
// Returns the receiver;
TransisObject.delay = function(f) {
  delayPostFlushCallbacks.push(f);
  return this;
};

// Public: Creates a subclass of `Transis.Object`.
TransisObject.extend = function(f) {
  var subclass = function() { TransisObject.apply(this, arguments); };

  for (let k in this) { if (this.hasOwnProperty(k)) { subclass[k] = this[k]; } }

  subclass.prototype = Object.create(this.prototype);
  subclass.prototype.constructor = subclass;
  subclass.__super__ = this.prototype;

  if (typeof f === 'function') { f.call(subclass); }

  return subclass;
};

// Public: Defines a property on the class's prototype. Properties defined with this method are
// observable using the `Transis.Object#on` method.
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
// Examples
//
//   var Person = Transis.Object.extend(function() {
//     this.prop('firstName');
//     this.prop('lastName');
//     this.prop('fullName', {
//       on: ['firstName', 'lastName'],
//       get: function(firstName, lastName) {
//         return firstName + ' ' + lastName;
//       }
//     });
//   });
//
//   var p = new Person({firstName: 'John', lastName: 'Doe'});
//
//   console.log(p.firstName);
//   // John
//   console.log(p.lastName);
//   // Doe
//   console.log(p.fullName);
//   // John Doe
//   p.on('firstName', function() { console.log('firstName changed:', p.firstName); });
//   p.on('fullName', function() { console.log('fullName changed:', p.fullName); });
//   p.firstName = 'Jane';
//   // firstName changed: Jane
//   // fullName changed: Jane Doe
//
// Returns the receiver.
TransisObject.prop = function(name, opts = {}) {
  defineProp(this.prototype, name, opts);
  return this;
};

// Public: Creates multiple props at once from the given object.
//
// props - An object mapping prop names to their options. See `Transis.Object#prop` for the
//         available options.
//
// Returns the receiver.
TransisObject.props = function(props) {
  for (let name in props) { this.prop(name, props[name]); }
  return this;
};

// Public: Returns a string containing the class's name.
TransisObject.toString = function() { return this.displayName || this.name || '(Unknown)'; };

// Public: The `Transis.Object` initializer. Sets the given props and begins observing dependent
// property events. This method should never be called directly, its called by the `Transis.Object`
// constructor function.
//
// props - An object containing properties to set. Only properties defined via `Transis.Object.prop`
//         are settable.
TransisObject.prototype.init = function(props) { if (props) { this.set(props); } };

// Public: Defines an observable property directly on the receiver. See the `Transis.Object.prop`
// method for available options.
TransisObject.prototype.prop = function(name, opts = {}) {
  defineProp(this, name, opts);
  return this;
};

// Public: Creates multiple props at once from the given object directly on the receiver.
TransisObject.prototype.props = TransisObject.props;

// Public: Set multiple props at once. This method take special care to only set props that are
// defined with `Transis.Object.prop` and are not readonly.
//
// props - An object containing props to set.
//
// Returns nothing.
TransisObject.prototype.set = function(props) {
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
TransisObject.prototype.on = function(prop, callback) {
  this.__observers__ = this.__observers__ || {};
  this.__observers__[prop] = this.__observers__[prop] || [];
  this.__observers__[prop].push(callback);
  return this;
};

// Public: Remove a prop observer.
//
// prop     - The name of the property to stop observing.
// callback - The function passed to `Transis.Object#on`.
//
// Returns the receiver.
TransisObject.prototype.off = function(prop, callback) {
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
TransisObject.prototype.notify = function(event, ...args) {
  if (this.__observers__ && this.__observers__[event]) {
    for (let i = 0, n = this.__observers__[event].length; i < n; i++) {
      if (this.__observers__[event][i]) {
        try {
          this.__observers__[event][i](event, ...args);
        }
        catch (e) {
          console.error('Transis.Object#notify: exception caught in observer:', e);
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
TransisObject.prototype.didChange = function(name) {
  registerChange(this, name);

  // ensure that observers get triggered after promise callbacks
  if (!flushTimer) { flushTimer = setTimeout(function() { Promise.resolve().then(flush); }); }

  return this;
};

// Public: Returns a string representation of the object.
TransisObject.prototype.toString = function() {
  return `#<${this.constructor}:${this.objectId}>`;
};

// Public: Indicates whether the receiver is equal to the given object. The default implementation
// simply does an identity comparison using the `===` operator. You'll likely want to override
// this method in your sub-types in order to perform a more meaningful comparison.
//
// o - An object to compare against the receiver.
//
// Returns a `true` if the objects are equal and `false` otherwise.
TransisObject.prototype.eq = function(other) { return this === other; };

// Public: Resolves the given path into a value, relative to the receiver. See `util.getPath`.
TransisObject.prototype.getPath = function(path) { return util.getPath(this, path); };

// Internal: Returns the current value of the given property or the default value if it is not
// defined.
//
// Returns the value of the property.
// Throws `Error` if there is no property with the given name.
TransisObject.prototype._getProp = function(name) {
  var desc = this.__props__ && this.__props__[name], value;

  if (!desc) {
    throw new Error(`Transis.Object#_getProp: unknown prop name \`${name}\``);
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

  if (value === undefined) {
    if (typeof desc.default === 'function') {
      let defaultName = `__${name}_default`;

      if (!(defaultName in this)) {
        this[defaultName] = desc.default();
      }

      value = this[defaultName];
    }
    else {
      value = desc.default;
    }
  }

  value = (value === undefined) ? desc.default : value;

  if (desc.cache) { (this.__cache__ = this.__cache__ || {})[name] = value; }

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
TransisObject.prototype._setProp = function(name, value) {
  var descriptor = this.__props__ && this.__props__[name],
      key        = `__${name}`,
      old        = this._getProp(name);

  if (!descriptor) {
    throw new Error(`Transis.Object#_setProp: unknown prop name \`${name}\``);
  }

  if (descriptor.readonly) {
    throw new TypeError(`Transis.Object#_setProp: cannot set readonly property \`${name}\` of ${this}`);
  }

  if (descriptor.set) { descriptor.set.call(this, value); }
  else { this[key] = value; }

  if (!util.eq(old, this[key])) {
    this.didChange(name);
  }

  return old;
};

// Internal: Registers a proxy object. All prop changes on the receiver will be proxied to the
// given proxy object with the given name as a prefix for the property name.
TransisObject.prototype._registerProxy = function(object, name) {
  this.__proxies__ = this.__proxies__ || {};
  this.__proxies__[`${object.objectId},${name}`] = {object, name};
  return this;
};

// Internal: Deregisters a proxy object previously registered with `#_registerProxy`.
TransisObject.prototype._deregisterProxy = function(object, name) {
  if (this.__proxies__) { delete this.__proxies__[`${object.objectId},${name}`]; }
  return this;
};

TransisObject.displayName = 'Transis.Object';

export default TransisObject;
