(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define(factory);
	else if(typeof exports === 'object')
		exports["Basis"] = factory();
	else
		root["Basis"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

	var BasisObject = _interopRequire(__webpack_require__(1));

	var BasisArray = _interopRequire(__webpack_require__(2));

	var Model = _interopRequire(__webpack_require__(3));

	var react = _interopRequireWildcard(__webpack_require__(4));

	var util = _interopRequireWildcard(__webpack_require__(5));

	var parsers = _interopRequireWildcard(__webpack_require__(6));

	var pluralize = _interopRequire(__webpack_require__(7));

	module.exports = Object.assign({
	  Object: BasisObject,
	  Array: BasisArray,
	  A: BasisArray.of,
	  Model: Model,
	  pluralize: pluralize,
	  ReactPropsMixin: react.PropsMixin,
	  ReactStateMixin: react.StateMixin
	}, util, parsers);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

	var util = _interopRequireWildcard(__webpack_require__(5));

	var objectId = 0,
	    changedObjects = {},
	    delayCallbacks = [],
	    flushTimer;

	function BasisObject() {
	  Object.defineProperty(this, "objectId", { value: ++objectId });
	  this.init.apply(this, arguments);
	};

	BasisObject.displayName = "Basis.Object";

	// Internal: Processes a property change by traversing the property dependency graph and forwarding
	// changes to proxy objects.
	function didChange(object, name) {
	  (object.__changedProps__ = object.__changedProps__ || {})[name] = true;
	  changedObjects[object.objectId] = object;
	  uncache.call(object, name);

	  if (object.__deps__) {
	    var deps = object.__deps__[name];

	    if (deps) {
	      for (var i = 0, n = deps.length; i < n; i++) {
	        didChange(object, deps[i]);
	      }
	    }
	  }

	  if (object.__proxies__ && name.indexOf(".") === -1) {
	    for (var k in object.__proxies__) {
	      (function (k) {
	        util.detectRecursion(object, function () {
	          didChange(object.__proxies__[k].object, "" + object.__proxies__[k].name + "." + name);
	        });
	      })(k);
	    }
	  }
	}

	// Internal: Flushes the current change queue. This notifies observers of the changed props as well
	// as observers of any props that depend on the changed props. Observers are only invoked once per
	// flush, regardless of how many of their dependent props have changed. Additionaly, cached values
	// are cleared where appropriate.
	function flush() {
	  var ids = Object.keys(changedObjects),
	      f;

	  for (var j = 0, m = ids.length; j < m; j++) {
	    var object = changedObjects[ids[j]];
	    var changes = Object.keys(object.__changedProps__);

	    for (var i = 0, n = changes.length; i < n; i++) {
	      didChange(object, changes[i]);
	    }
	  }

	  for (var id in changedObjects) {
	    var object = changedObjects[id];
	    var changes = Object.keys(object.__changedProps__);
	    var star = false;

	    object.__changedProps__ = {};

	    for (var i = 0, n = changes.length; i < n; i++) {
	      if (changes[i].indexOf(".") === -1) {
	        star = true;
	      }
	      object.notify(changes[i]);
	    }

	    if (star) {
	      object.notify("*");
	    }
	  }

	  changedObjects = {};

	  flushTimer = null;

	  while (f = delayCallbacks.shift()) {
	    f();
	  }
	}

	// Internal: Caches the given name/value pair on the receiver.
	function cache(name, value) {
	  (this.__cache__ = this.__cache__ || {})[name] = value;
	}

	// Internal: Removes the given name from the cache.
	function uncache(name) {
	  if (this.__cache__) {
	    delete this.__cache__[name];
	  }
	}

	// Internal: Indicates whether the current name has a value cached.
	function isCached(name) {
	  return this.__cache__ ? this.__cache__.hasOwnProperty(name) : false;
	}

	// Internal: Returns the cached value for the given name.
	function getCached(name) {
	  return this.__cache__ ? this.__cache__[name] : undefined;
	}

	// Internal: Defines a property on the given object. See the docs for `Basis.prop`.
	//
	// Returns nothing.
	function defineProp(object, name) {
	  var opts = arguments[2] === undefined ? {} : arguments[2];

	  var descriptor = Object.assign({
	    name: name,
	    get: null,
	    set: null,
	    "default": undefined,
	    on: [],
	    cache: false
	  }, opts, { readonly: opts.get && !opts.set });

	  if (!object.hasOwnProperty("__props__")) {
	    object.__props__ = Object.create(object.__props__ || null);
	  }

	  object.__props__[name] = descriptor;

	  if (!object.hasOwnProperty("__deps__")) {
	    object.__deps__ = Object.create(object.__deps__ || null);
	  }

	  descriptor.on.forEach(function (prop) {
	    (object.__deps__[prop] = object.__deps__[prop] || []).push(name);

	    if (prop.indexOf(".") !== -1) {
	      var segments = prop.split("."),
	          first = segments[0];
	      if (segments.length > 2) {
	        throw new Error("Basis.Object.defineProp: dependent property paths of more than two segments are not allowed: `" + prop + "`");
	      }
	      (object.__deps__[first] = object.__deps__[first] || []).push(name);
	    }
	  });

	  Object.defineProperty(object, name, {
	    get: function get() {
	      return this._getProp(name);
	    },
	    set: descriptor.readonly ? undefined : function (value) {
	      this._setProp(name, value);
	    },
	    configurable: false,
	    enumerable: true
	  });
	}

	// Public: Flush the pending change queue. This should only be used in specs.
	BasisObject.flush = function () {
	  clearTimeout(flushTimer);
	  flush();
	  return this;
	};

	// Public: Register a callback to be invoked immediately after the next flush cycle completes.
	//
	// f - A function.
	//
	// Returns the receiver;
	BasisObject.delay = function (f) {
	  delayCallbacks.push(f);
	  return this;
	};

	// Public: Creates a subclass of `Basis.Object`.
	BasisObject.extend = function (f) {
	  var subclass = function subclass() {
	    BasisObject.apply(this, arguments);
	  };

	  for (var k in this) {
	    if (this.hasOwnProperty(k)) {
	      subclass[k] = this[k];
	    }
	  }

	  subclass.prototype = Object.create(this.prototype);
	  subclass.prototype.constructor = subclass;
	  subclass.__super__ = this.prototype;

	  if (typeof f === "function") {
	    f.call(subclass);
	  }

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
	//   on        - An array of dependent prop names. Observers of the prop are notified when any of
	//               these props change.
	//   cache     - Set this to true to enable property caching. This is useful with computed
	//               properties that have their dependent events defined. If dependent events aren't
	//               defined, then the initially cached value will never be cleared.
	//
	// Returns the receiver.
	BasisObject.prop = function (name) {
	  var opts = arguments[1] === undefined ? {} : arguments[1];

	  defineProp(this.prototype, name, opts);
	  return this;
	};

	// Public: Creates multiple props at once from the given object.
	//
	// props - An object mapping prop names to their options. See `Basis.Object#prop` for the available
	//         options.
	//
	// Returns the receiver.
	BasisObject.props = function (props) {
	  for (var _name in props) {
	    this.prop(_name, props[_name]);
	  }
	  return this;
	};

	// Public: Returns a string containing the class's name.
	BasisObject.toString = function () {
	  return this.displayName || this.name || "(Unknown)";
	};

	// Public: The `Basis.Object` initializer. Sets the given props and begins observing dependent
	// property events. This method should never be called directly, its called by the `Basis.Object`
	// constructor function.
	//
	// props - An object containing properties to set. Only properties defined via `Basis.Object.prop`
	//         are settable.
	BasisObject.prototype.init = function (props) {
	  if (props) {
	    this.set(props);
	  }
	};

	// Public: Defines an observable property directly on the receiver. See the `Basis.Object.prop`
	// method for available options.
	BasisObject.prototype.prop = function (name) {
	  var opts = arguments[1] === undefined ? {} : arguments[1];

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
	BasisObject.prototype.set = function (props) {
	  for (var k in props) {
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
	BasisObject.prototype.on = function (prop, callback) {
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
	BasisObject.prototype.off = function (prop, callback) {
	  if (this.__observers__ && this.__observers__[prop]) {
	    for (var i = this.__observers__[prop].length - 1; i >= 0; i--) {
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
	BasisObject.prototype.notify = function (event) {
	  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	    args[_key - 1] = arguments[_key];
	  }

	  if (this.__observers__ && this.__observers__[event]) {
	    for (var i = 0, n = this.__observers__[event].length; i < n; i++) {
	      if (this.__observers__[event][i]) {
	        try {
	          var _observers__$event;

	          (_observers__$event = this.__observers__[event])[i].apply(_observers__$event, [event].concat(args));
	        } catch (e) {
	          console.error("Basis.Object#notify: exception caught in observer:", e);
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
	BasisObject.prototype.didChange = function (name) {
	  (this.__changedProps__ = this.__changedProps__ || {})[name] = true;
	  changedObjects[this.objectId] = this;

	  // FIXME: The double setTimeout here is to work around an issue we've been seeing in Firefox
	  // with promises. In Chrome the flush is getting run after promises callbacks are invoked but
	  // in firefox its running before which is causing some timing issues. The double setTimeout
	  // ensures that the flush gets run after promise callbacks.
	  if (!flushTimer) {
	    flushTimer = setTimeout(function () {
	      setTimeout(flush);
	    });
	  }

	  return this;
	};

	// Public: Returns a string representation of the object.
	BasisObject.prototype.toString = function () {
	  return "#<" + this.constructor + ":" + this.objectId + ">";
	};

	// Public: Indicates whether the receiver is equal to the given object. The default implementation
	// simply does an identity comparison using the `===` operator. You'll likely want to override
	// this method in your sub-types in order to perform a more meaningful comparison.
	//
	// o - An object to compare against the receiver.
	//
	// Returns a `true` if the objects are equal and `false` otherwise.
	BasisObject.prototype.eq = function (other) {
	  return this === other;
	};

	BasisObject.prototype.getPath = function (path) {
	  return util.getPath(this, path);
	};

	// Internal: Returns the current value of the given property or the default value if it is not
	// defined.
	//
	// Returns the value of the property.
	// Throws `Error` if there is no property with the given name.
	BasisObject.prototype._getProp = function (name) {
	  var descriptor = this.__props__ && this.__props__[name],
	      key = "__" + name,
	      value;

	  if (!descriptor) {
	    throw new Error("Basis.Object#_getProp: unknown prop name `" + name + "`");
	  }

	  if (descriptor.cache && isCached.call(this, name)) {
	    return getCached.call(this, name);
	  }

	  value = descriptor.get ? descriptor.get.call(this) : this[key];
	  value = value === undefined ? descriptor["default"] : value;

	  if (descriptor.cache) {
	    cache.call(this, name, value);
	  }

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
	BasisObject.prototype._setProp = function (name, value) {
	  var descriptor = this.__props__ && this.__props__[name],
	      key = "__" + name,
	      old = this._getProp(name);

	  if (!descriptor) {
	    throw new Error("Basis.Object#_setProp: unknown prop name `" + name + "`");
	  }

	  if (descriptor.readonly) {
	    throw new TypeError("Basis.Object#_setProp: cannot set readonly property `" + name + "` of " + this);
	  }

	  if (descriptor.set) {
	    descriptor.set.call(this, value);
	  } else {
	    this[key] = value;
	  }

	  this.didChange(name);

	  return old;
	};

	// Internal: Registers a proxy object. All prop changes on the receiver will be proxied to the
	// given proxy object with the given name as a prefix for the property name.
	BasisObject.prototype._registerProxy = function (object, name) {
	  this.__proxies__ = this.__proxies__ || {};
	  this.__proxies__["" + object.objectId + "," + name] = { object: object, name: name };
	  return this;
	};

	// Internal: Deregisters a proxy object previously registered with `#_registerProxy`.
	BasisObject.prototype._deregisterProxy = function (object, name) {
	  if (this.__proxies__) {
	    delete this.__proxies__["" + object.objectId + "," + name];
	  }
	  return this;
	};

	BasisObject.displayName = "Basis.Object";

	module.exports = BasisObject;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

	var BasisObject = _interopRequire(__webpack_require__(1));

	var util = _interopRequireWildcard(__webpack_require__(5));

	var iframe;

	var BasisArray = (function () {
	  // http://danielmendel.github.io/blog/2013/02/20/subclassing-javascript-arrays/

	  if (typeof window !== "undefined") {
	    // browser
	    iframe = document.createElement("iframe");
	    iframe.style.display = "none";
	    document.body.appendChild(iframe);
	    frames[frames.length - 1].document.write("<script>parent._Array = Array;</script>");
	    var _Array = window._Array;
	    delete window._Array;
	    document.body.removeChild(iframe);
	    return _Array;
	  } else {
	    // node.js
	    return __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"vm\""); e.code = 'MODULE_NOT_FOUND'; throw e; }())).runInNewContext("Array");
	  }
	})();

	var _BasisArray$prototype = BasisArray.prototype;
	var concat = _BasisArray$prototype.concat;
	var slice = _BasisArray$prototype.slice;
	var splice = _BasisArray$prototype.splice;
	var map = _BasisArray$prototype.map;
	var filter = _BasisArray$prototype.filter;

	Object.assign(BasisArray, BasisObject);
	Object.assign(BasisArray.prototype, BasisObject.prototype);

	// Internal: Copy over polyfilled methods from `Array` to `Basis.Array`.
	["findIndex", "find"].forEach(function (x) {
	  BasisArray.prototype[x] = Array.prototype[x];
	});

	// Public: Returns a new `Basis.Array` containing the given arguments as contents. This is the main
	// `Basis.Array` constructor, never use the `Basis.Array` constructor function directly.
	//
	// ...elements - The elements to add to the array.
	//
	// Returns a new `Basis.Array`.
	BasisArray.of = function () {
	  var a = new BasisArray(arguments.length),
	      i,
	      n;
	  BasisObject.call(a);
	  for (i = 0, n = arguments.length; i < n; i++) {
	    a[i] = arguments[i];
	  }
	  return a;
	};

	// Public: Creates a new `Basis.Array` from the given array-like object. Useful for converting a
	// regular array to a `Basis.Array`.
	//
	// a - An array-like object.
	//
	// Returns a new `Basis.Array`.
	BasisArray.from = function (a) {
	  return BasisArray.of.apply(null, a);
	};

	(function () {
	  this.displayName = "Basis.Array";

	  this.prop("size", { get: function get() {
	      return this.length;
	    } });
	  this.prop("first", { get: function get() {
	      return this[0];
	    } });
	  this.prop("@", { get: function get() {
	      return this;
	    } });

	  // Public: Element reference and assignment method. When given one argument, returns the item at
	  // the specified index. When passed, two arguments, the second argument is set as the item at the
	  // index indicated by the first.
	  //
	  // Negative indices can be passed to reference elements from the end of the array (-1 is the last
	  // element in the array).
	  //
	  // i - A number representing an index in the array.
	  // v - A value to set at the given index (optional).
	  //
	  // Returns the value at the given index when passed one argument. Returns `undefined` if the index
	  //   is out of range.
	  // Returns `v` when given two arguments.
	  this.prototype.at = function (i, v) {
	    var length = this.length;

	    if (i < 0) {
	      i = length + i;
	    }

	    if (arguments.length === 1) {
	      return i >= 0 && i < length ? this[i] : undefined;
	    } else {
	      this.splice(i, 1, v);
	      return v;
	    }
	  };

	  // Public: `Basis.Array` equality test. This method performs an element-wise comparison between the
	  // receiver and the given array.
	  //
	  // other - A `Basis.Array` or native array to compare to the receiver.
	  //
	  // Returns `true` if the arrays are equal and `false` otherwise.
	  this.prototype.eq = function (other) {
	    return util.arrayEq(this, other);
	  };

	  // Internal: Performs the actual splice. This method is called by `Array#splice` and is always
	  // passed the number of elements to remove and an array of items to add whereas the `splice`
	  // method is more flexible in the arguments that it accepts.
	  this.prototype._splice = function (i, n, added) {
	    var removed = splice.apply(this, [i, n].concat(added));

	    if (n !== added.length) {
	      this.didChange("size");
	    }
	    if (i === 0) {
	      this.didChange("first");
	    }
	    this.didChange("@");

	    if (this.__proxy__) {
	      removed.forEach(function (x) {
	        if (x instanceof BasisObject || x instanceof BasisArray) {
	          x._deregisterProxy(this.__proxy__.to, this.__proxy__.name);
	        }
	      }, this);

	      added.forEach(function (x) {
	        if (x instanceof BasisObject || x instanceof BasisArray) {
	          x._registerProxy(this.__proxy__.to, this.__proxy__.name);
	        }
	      }, this);

	      this.__proxy__.to.didChange(this.__proxy__.name);
	    }

	    return BasisArray.from(removed);
	  };

	  // Public: Array mutator. All mutations made to an array (pushing, popping, assignment, etc.) are
	  // made through this method.
	  //
	  // i        - The index to start the mutation, may be negative.
	  // n        - The number of items to remove, starting from `i`. If not given, then all items
	  //            starting from `i` are removed.
	  // ...items - Zero or more items to add to the array, starting at index `i`.
	  //
	  // Returns a new `Basis.Array` containing the elements removed.
	  // Throws `Error` when given an index that is out of range.
	  this.prototype.splice = function (i, n) {
	    var added = slice.call(arguments, 2),
	        index = i < 0 ? this.length + i : i;

	    if (index < 0) {
	      throw new Error("Basis.Array#splice: index " + i + " is too small for " + this);
	    }

	    if (n === undefined) {
	      n = this.length - index;
	    }

	    return this._splice(index, n, added);
	  };

	  // Public: Adds one or more elements to the end of the array and returns the new length.
	  //
	  // ...elements - One or more objects to add to the end of the array.
	  //
	  // Returns the new length of the array.
	  this.prototype.push = function () {
	    var args = slice.call(arguments);
	    this.splice.apply(this, [this.length, 0].concat(args));
	    return this.length;
	  };

	  // Public: Adds one or more elements to the beginning of the array and returns the new length.
	  //
	  // ...elements - One or more objects to add to the beginning of the array.
	  //
	  // Returns the new length of the array.
	  this.prototype.unshift = function () {
	    var args = slice.call(arguments);
	    this.splice.apply(this, [0, 0].concat(args));
	    return this.length;
	  };

	  // Public: Removes the last element from the array and returns the element.
	  //
	  // Returns the last element in the array or `undefined` if the array length is 0.
	  this.prototype.pop = function () {
	    return this.length > 0 ? this.splice(-1, 1).at(0) : undefined;
	  };

	  // Public: Removes the first element from the array and returns the element.
	  //
	  // Returns the first element in the array or `undefined` if the array length is 0.
	  this.prototype.shift = function () {
	    return this.length > 0 ? this.splice(0, 1).at(0) : undefined;
	  };

	  // Public: Returns a shallow copy of a portion of an array into a new array.
	  //
	  // begin - Index at which to begin extraction. A negative index indicates an offset from the end
	  //         of the array. If omitted, slice begins from index 0.
	  // end   - Index at which to end extraction. Extracts up to but not including this index. A
	  //         negative index indicates an offset from the end of the array. If omitted, slice
	  //         extracts through the end of the array.
	  //
	  // Returns a new `Basis.Array`.
	  this.prototype.slice = function () {
	    return BasisArray.from(slice.apply(this, arguments));
	  };

	  // Public: Creates a new array with the results of calling the given function on every element in
	  // the array.
	  //
	  // callback - Function that produces a new element of the array. It takes three arguments:
	  //   current - The current element being processed.
	  //   index   - The index of the current element.
	  //   array   - The array map was called on.
	  // ctx      - Value to use as this when invoking callback.
	  //
	  // Returns a new `Basis.Array`.
	  this.prototype.map = function () {
	    return BasisArray.from(map.apply(this, arguments));
	  };

	  // Public: Creates a new array with all elements that pass the test implemented by the provided
	  // function.
	  //
	  // callback - Function to test each element of the array. Return true to keep the element and
	  //            false to discard.
	  // ctx      - Value to use as this when invoking callback.
	  //
	  // Returns a new `Basis.Array`.
	  this.prototype.filter = function () {
	    return BasisArray.from(filter.apply(this, arguments));
	  };

	  // Public: Returns a new `Basis.Array` comprised of the receiver joined with the array(s) or
	  // value(s) provided as arguments.
	  //
	  // ...value - Arrays or values to concatenate into the new array.
	  //
	  // Returns a new `Basis.Array`.
	  this.prototype.concat = function () {
	    return BasisArray.from(concat.apply(this, arguments));
	  };

	  // Public: Replaces the contents of the receiver with the contents of the given array.
	  //
	  // a - A `Basis.Array` or native array.
	  //
	  // Returns the receiver.
	  this.prototype.replace = function (a) {
	    this.splice.apply(this, [0, this.length].concat(a));
	    return this;
	  };

	  // Public: Clears the array by removing all elements.
	  //
	  // Returns the receiver.
	  this.prototype.clear = function () {
	    this.splice(0, this.length);
	    return this;
	  };

	  // Public: Builds a new array that is the one-dimensional flattening of the receiver. In other
	  // words, for every item that is itself an array, its items are added to the new array.
	  //
	  // Returns a new `Basis.Array` instance.
	  this.prototype.flatten = function () {
	    var a = BasisArray.of();

	    for (var i = 0, n = this.length; i < n; i++) {
	      var el = this[i];

	      if (el instanceof BasisArray) {
	        a = a.concat(el.flatten());
	      } else if (Array.isArray(el)) {
	        a = a.concat(BasisArray.from(el).flatten());
	      } else {
	        a.push(el);
	      }
	    }

	    return a;
	  };

	  // Public: Returns a new array with `null` and `undefined` items removed.
	  this.prototype.compact = function () {
	    return this.reduce(function (acc, el) {
	      if (el != null) {
	        acc.push(el);
	      }
	      return acc;
	    }, BasisArray.of());
	  };

	  // Public: Returns a new array containing only the unique items in the receiver.
	  this.prototype.uniq = function () {
	    var map = new Map();

	    return this.reduce(function (acc, el) {
	      if (!map.has(el)) {
	        map.set(el, true);acc.push(el);
	      }
	      return acc;
	    }, BasisArray.of());
	  };

	  // Public: Yields each set of consecutive `n` elements to the function as a native array.
	  //
	  // n - The number of consecutive elements to yield at a time.
	  // f - The function to yield each consecutive set of elements to.
	  //
	  // Examples
	  //
	  //   Basis.A(1,2,3,4,5,6,7).forEachCons(2, console.log);
	  //   // outputs:
	  //   // [ 1, 2 ]
	  //   // [ 2, 3 ]
	  //   // [ 3, 4 ]
	  //   // [ 4, 5 ]
	  //   // [ 5, 6 ]
	  //   // [ 6, 7 ]
	  //
	  // Returns nothing.
	  this.prototype.forEachCons = function (n, f) {
	    var a = [];

	    this.forEach(function (el) {
	      a.push(el);
	      if (a.length > n) {
	        a.shift();
	      }
	      if (a.length === n) {
	        f(a.slice(0));
	      }
	    });
	  };

	  // Public: Yields each slice of `n` elements to the function as a native array.
	  //
	  // n - The size of each slice to yield.
	  // f - The function to yield each slice to.
	  //
	  // Examples
	  //
	  //   Basis.A(1,2,3,4,5,6,7).forEachSlice(2, console.log);
	  //   // outputs:
	  //   // [ 1, 2 ]
	  //   // [ 3, 4 ]
	  //   // [ 5, 6 ]
	  //   // [ 7 ]
	  //
	  // Returns the receiver.
	  this.prototype.forEachSlice = function (n, f) {
	    var a = [];

	    this.forEach(function (el) {
	      a.push(el);
	      if (a.length === n) {
	        f(a);a = [];
	      }
	    });

	    if (a.length > 0) {
	      f(a);
	    }
	  };

	  // Public: Causes the array to begin proxying prop change notifications on itself as well as its
	  // elements to the given proxy object.
	  //
	  // to   - The object to proxy prop changes to.
	  // name - The name to use as a prefix on the proxied prop name.
	  //
	  // Returns the receiver.
	  this.prototype.proxy = function (to, name) {
	    if (this.__proxy__) {
	      this.unproxy();
	    }

	    this.__proxy__ = { to: to, name: name };

	    this.forEach(function (x) {
	      if (x instanceof BasisObject || x instanceof BasisArray) {
	        x._registerProxy(to, name);
	      }
	    });

	    return this;
	  };

	  // Public: Stop proxying prop changes.
	  this.prototype.unproxy = function () {
	    if (this.__proxy__) {
	      this.forEach(function (x) {
	        if (x instanceof BasisObject || x instanceof BasisArray) {
	          x._deregisterProxy(this.__proxy__.to, this.__proxy__.name);
	        }
	      }, this);
	      delete this.__proxy__;
	    }

	    return this;
	  };

	  // Public: Returns a string representation of the array.
	  this.prototype.toString = function () {
	    return "[" + this.map(function (x) {
	      return String(x);
	    }).join(", ") + "]";
	  };
	}).call(BasisArray);

	module.exports = BasisArray;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

	var pluralize = _interopRequire(__webpack_require__(7));

	var IdMap = _interopRequire(__webpack_require__(8));

	var BasisObject = _interopRequire(__webpack_require__(1));

	var BasisArray = _interopRequire(__webpack_require__(2));

	var Validations = _interopRequire(__webpack_require__(9));

	var attrs = _interopRequireWildcard(__webpack_require__(10));

	var util = _interopRequireWildcard(__webpack_require__(5));

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

	  removed = BasisArray.prototype._splice.call(this, i, n, added);

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
	  var a = BasisArray.of();
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

	  IdMap["delete"](this);
	  this.isBusy = false;
	  this.sourceState = DELETED;
	  this._clearErrors();

	  for (var _name in this.associations) {
	    var _ret = (function (_name) {
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
	    })(_name);

	    if (_ret === "continue") continue;
	  }
	}

	var Model = BasisObject.extend(function () {
	  this.displayName = "Basis.Model";

	  // Public: Creates a subclass of `Basis.Model`. This method overrides the `Basis.Object.extend`
	  // method in order to force `Model` subclasses to be named.
	  this.extend = function (name, f) {
	    if (typeof name !== "string") {
	      throw new Error("" + this + ".extend: a name is required");
	    }

	    var subclass = BasisObject.extend.call(this);
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
	      type: "hasMany", name: name, klass: klass, singular: pluralize(name, 1), debugName: "" + this.toString() + "#" + name
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
	    model = IdMap.get(this, id) || new this();
	    delete attrs.id;

	    // extract associated attributes
	    for (var _name in associations) {
	      var desc = associations[_name];

	      if (_name in attrs) {
	        associated[_name] = attrs[_name];
	        delete attrs[_name];
	      } else if (desc.type === "hasOne" && "" + _name + "Id" in attrs) {
	        associated[_name] = attrs["" + _name + "Id"];
	        delete attrs["" + _name + "Id"];
	      } else if (desc.type === "hasOne" && "" + _name + "_id" in attrs) {
	        associated[_name] = attrs["" + _name + "_id"];
	        delete attrs["" + _name + "_id"];
	      } else if (desc.type === "hasMany" && "" + desc.singular + "Ids" in attrs) {
	        associated[_name] = attrs["" + desc.singular + "Ids"];
	        delete attrs["" + desc.singular + "Ids"];
	      } else if (desc.type === "hasMany" && "" + desc.singular + "_ids" in attrs) {
	        associated[_name] = attrs["" + desc.singular + "_ids"];
	        delete attrs["" + desc.singular + "_ids"];
	      }
	    }

	    // set non-association attributes
	    model.set(attrs);

	    // set id if necessary
	    if (model.id === undefined) {
	      model.id = id;
	    }

	    // load and set each association
	    for (var _name2 in associated) {
	      var _ret = (function (_name2) {
	        var klass = resolve(associations[_name2].klass);
	        var data = associated[_name2];

	        // clear association
	        if (!data) {
	          model[_name2] = null;
	          return "continue";
	        }

	        if (associations[_name2].type === "hasOne") {
	          var other = typeof data === "object" ? klass.load(data) : klass.local(data);
	          model[_name2] = other;
	        } else if (associations[_name2].type === "hasMany") {
	          (function () {
	            var others = [];
	            data.forEach(function (o) {
	              others.push(typeof o === "object" ? klass.load(o) : klass.local(o));
	            });
	            model[_name2] = others;
	          })();
	        }
	      })(_name2);

	      if (_ret === "continue") continue;
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
	    var _this = this;

	    return objects.map(function (object) {
	      return _this.load(object);
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
	        a = BasisArray.of(),
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
	      var _this = this;

	      var opts = arguments[0] === undefined ? {} : arguments[0];

	      if (this.isBusy) {
	        if (!queued) {
	          promise = promise.then(function () {
	            _this.query(queued);
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
	              _this.replace(modelClass.loadAll(result));
	            } else if (result.results) {
	              _this.replace(modelClass.loadAll(result.results));
	              _this.meta = result.meta;
	            }
	          } catch (e) {
	            console.error(e);throw e;
	          }
	          _this.isBusy = false;
	          _this.error = undefined;
	        }, function (e) {
	          _this.isBusy = false;
	          _this.error = e;
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
	    return IdMap.get(this, id) || this.empty(id);
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
	    var _this = this;

	    var opts = arguments[1] === undefined ? {} : arguments[1];

	    var model = this.local(id),
	        getOpts = Object.assign({}, opts);
	    delete getOpts.refresh;

	    if (model.isEmpty || opts.refresh) {
	      model.isBusy = true;
	      model.__promise__ = this._callMapper("get", [id, getOpts]).then(function (result) {
	        model.isBusy = false;
	        try {
	          _this.load(result);
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
	    IdMap.clear();return this;
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
	    var _this = this;

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
	      console.warn("" + _this + "#_callMapper(" + method + "): promise rejection:", error);
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

	      IdMap.insert(this);
	    }
	  });

	  this.prop("sourceState");

	  this.prop("isNew", {
	    on: ["sourceState"],
	    get: function get() {
	      return this.sourceState === NEW;
	    }
	  });

	  this.prop("isEmpty", {
	    on: ["sourceState"],
	    get: function get() {
	      return this.sourceState === EMPTY;
	    }
	  });

	  this.prop("isLoaded", {
	    on: ["sourceState"],
	    get: function get() {
	      return this.sourceState === LOADED;
	    }
	  });

	  this.prop("isDeleted", {
	    on: ["sourceState"],
	    get: function get() {
	      return this.sourceState === DELETED;
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
	    get: function get() {
	      return Object.keys(this.changes).length > 0;
	    }
	  });

	  // Public: Returns a boolean indicating whether the model has any changes or if any of its owned
	  // associated models have changes.
	  this.prop("hasChanges", {
	    on: ["changes"],
	    get: function get() {
	      if (this.hasOwnChanges) {
	        return true;
	      }

	      var r = false;

	      util.detectRecursion(this, (function () {
	        for (var _name in this.associations) {
	          if (!this.associations[_name].owner) {
	            continue;
	          }

	          if (this.associations[_name].type === "hasOne") {
	            if (this[_name] && this[_name].hasChanges) {
	              r = true;
	            }
	          } else if (this.associations[_name].type === "hasMany") {
	            if (this[_name].some(function (m) {
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

	  // Public: Object containing any validation errors on the model. The keys of the object are theo
	  // properties that have errors and the values are an array of error messages.
	  this.prop("errors", {
	    get: function get() {
	      return this.__errors = this.__errors || {};
	    }
	  });

	  // Public: Returns a boolean indicating whether the model has any validation errors on its own
	  // properties. Marking the model for destruction by setting the `_destroy` attribute will cause
	  // this property to return `false` regardless of whether there are validation errors.
	  this.prop("hasOwnErrors", {
	    on: ["errors", "_destroy"],
	    get: function get() {
	      return !this._destroy && Object.keys(this.errors).length > 0;
	    }
	  });

	  // Public: Returns a boolean indicating whether the model has any validattion errors or if any of
	  // its owned associated models have validation errors.
	  this.prop("hasErrors", {
	    on: ["hasOwnErrors"],
	    get: function get() {
	      if (this.hasOwnErrors) {
	        return true;
	      }

	      var r = false;

	      util.detectRecursion(this, (function () {
	        for (var _name in this.associations) {
	          if (!this.associations[_name].owner) {
	            continue;
	          }

	          if (this.associations[_name].type === "hasOne") {
	            if (this[_name] && this[_name].hasErrors) {
	              r = true;
	            }
	          } else if (this.associations[_name].type === "hasMany") {
	            if (this[_name].some(function (m) {
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
	    var _this = this;

	    var opts = arguments[0] === undefined ? {} : arguments[0];

	    if (!this.isNew && !this.isLoaded || this.isBusy) {
	      throw new Error("" + this.constructor + "#save: can't save a model in the " + this.stateString() + " state: " + this);
	    }

	    this.isBusy = true;

	    this.__promise__ = this.constructor._callMapper(this.isNew ? "create" : "update", [this, opts]).then(function (attrs) {
	      _this.isBusy = false;
	      try {
	        _this.load(attrs);
	      } catch (e) {
	        console.error(e);throw e;
	      }
	    }, function (errors) {
	      _this.isBusy = false;
	      _this._loadErrors(errors);
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
	    var _this = this;

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
	        mapperDeleteSuccess.call(_this);
	      }, function (errors) {
	        _this.isBusy = false;
	        _this._loadErrors(errors);
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
	    var _this = this;

	    var change = this.changes[name];

	    if (change && this.associations[name] && this.associations[name].type === "hasMany") {
	      var _ret = (function () {
	        var previous = _this[name].slice();
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

	      if (typeof _ret === "object") return _ret.v;
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
	    var _this = this;

	    var opts = arguments[0] === undefined ? {} : arguments[0];

	    var associations = this.associations;

	    for (var prop in this.changes) {
	      (function (prop) {
	        if (associations[prop] && associations[prop].type === "hasMany") {
	          var removed = _this.changes[prop].removed.slice();
	          var added = _this.changes[prop].added.slice();

	          removed.reverse().forEach(function (m) {
	            _this[prop].push(m);
	          });
	          added.forEach(function (m) {
	            _this[prop].splice(_this[prop].indexOf(m), 1);
	          });
	        } else {
	          _this[prop] = _this.changes[prop];
	        }
	      })(prop);
	    }

	    util.detectRecursion(this, (function () {
	      for (var _name in associations) {
	        var desc = associations[_name];

	        if (!desc.owner) {
	          continue;
	        }
	        if (opts.except === _name) {
	          continue;
	        }
	        if (Array.isArray(opts.except) && opts.except.indexOf(_name) >= 0) {
	          continue;
	        }

	        if (desc.type === "hasOne") {
	          this[_name] && this[_name].undoChanges();
	        } else if (desc.type === "hasMany") {
	          this[_name].forEach(function (m) {
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
	    this.errors[name] = this.errors[name] || [];

	    if (this.errors[name].indexOf(message) === -1) {
	      this.errors[name].push(message);
	      this.didChange("errors");
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

	    return !(name in this.errors);
	  };

	  // Public: Runs all registered validators for all properties and also validates owned
	  // associations.
	  //
	  // Returns `true` if no validation errors are found and `false` otherwise.
	  this.prototype.validate = function () {
	    var associations = this.associations;

	    this._clearErrors();

	    for (var _name in this.validators) {
	      this.validateAttr(_name);
	    }

	    util.detectRecursion(this, (function () {
	      for (var _name2 in associations) {
	        var desc = associations[_name2];

	        if (!desc.owner) {
	          continue;
	        }

	        if (desc.type === "hasOne") {
	          this[_name2] && !this[_name2]._destroy && this[_name2].validate();
	        } else if (desc.type === "hasMany") {
	          this[_name2].forEach(function (m) {
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

	    for (var _name in this.associations) {
	      if (this.associations[_name].type === "hasOne") {
	        if (this[_name] && this[_name].id) {
	          attrs[_name] = this[_name].id;
	        }
	      } else if (this.associations[_name].type === "hasMany") {
	        var ids = this[_name].map(function (x) {
	          return x.id;
	        }).compact();
	        if (ids.length) {
	          attrs[_name] = ids;
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
	    var _this = this;

	    if (typeof errors === "object") {
	      for (var k in errors) {
	        (function (k) {
	          if (Array.isArray(errors[k])) {
	            errors[k].forEach(function (error) {
	              this.addError(k, error);
	            }, _this);
	          } else {
	            _this.addError(k, String(errors[k]));
	          }
	        })(k);
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
	      delete this.errors[name];
	    } else {
	      this.__errors = {};
	    }
	    this.didChange("errors");
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

	Object.assign(Model, Validations["static"]);
	Object.assign(Model.prototype, Validations.instance);

	module.exports = Model;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

	var BasisArray = _interopRequire(__webpack_require__(2));

	var PropsMixin = exports.PropsMixin = function PropsMixin(props) {
	  return {
	    componentWillMount: function componentWillMount() {
	      var _this = this;

	      this._basisFU = this._basisFU || function () {
	        _this.isMounted() && _this.forceUpdate();
	      };

	      for (var k in props) {
	        (function (k) {
	          props[k].forEach(function (prop) {
	            if (this.props[k]) {
	              this.props[k].on(prop, this._basisFU);
	            }
	          }, _this);
	        })(k);
	      }
	    },

	    componentWillUnmount: function componentWillUnmount() {
	      var _this = this;

	      for (var k in props) {
	        (function (k) {
	          props[k].forEach(function (prop) {
	            if (this.props[k]) {
	              this.props[k].off(prop, this._basisFU);
	            }
	          }, _this);
	        })(k);
	      }
	    },

	    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
	      var _this = this;

	      for (var k in props) {
	        (function (k) {
	          props[k].forEach(function (prop) {
	            if (nextProps[k] !== this.props[k]) {
	              if (this.props[k]) {
	                this.props[k].off(prop, this._basisFU);
	              }
	              if (nextProps[k]) {
	                nextProps[k].on(prop, this._basisFU);
	              }
	            }
	          }, _this);
	        })(k);
	      }
	    }
	  };
	};

	var StateMixin = exports.StateMixin = function StateMixin(object, props) {
	  if (typeof props !== "object") {
	    props = BasisArray.from(arguments).slice(1).reduce(function (acc, prop) {
	      acc[prop] = [];
	      return acc;
	    }, {});
	  }

	  return {
	    getInitialState: function getInitialState() {
	      var state = {};
	      for (var k in props) {
	        state[k] = object[k];
	      }
	      return state;
	    },

	    componentWillMount: function componentWillMount() {
	      var _this = this;

	      this._basisFU = this._basisFU || function () {
	        _this.isMounted() && _this.forceUpdate();
	      };

	      this._basisSyncState = function () {
	        var state = {};

	        for (var k in props) {
	          (function (k) {
	            if (_this.state[k] !== object[k]) {
	              if (_this.state[k] && typeof _this.state[k].off === "function") {
	                props[k].forEach(function (path) {
	                  _this.state[k].off(path, _this._basisFU);
	                });
	              }

	              if (object[k] && typeof object[k].on === "function") {
	                props[k].forEach(function (path) {
	                  object[k].on(path, _this._basisFU);
	                });
	              }

	              state[k] = object[k];
	            }
	          })(k);
	        }

	        if (Object.keys(state).length) {
	          _this.setState(state);
	        }
	      };

	      for (var k in props) {
	        (function (k) {
	          if (object[k] && typeof object[k].on === "function") {
	            props[k].forEach(function (path) {
	              object[k].on(path, _this._basisFU);
	            });
	          }
	        })(k);
	      }

	      object.on("*", this._basisSyncState);
	    },

	    componentWillUnmount: function componentWillUnmount() {
	      var _this = this;

	      for (var k in props) {
	        (function (k) {
	          if (_this.state[k] && typeof _this.state[k].off === "function") {
	            props[k].forEach(function (path) {
	              _this.state[k].off(path, _this._basisFU);
	            });
	          }
	        })(k);
	      }

	      object.off("*", this._basisSyncState);
	    }
	  };
	};
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	// Internal: Used to detect cases of recursion on the same pair of objects. Returns `true` if the
	// given objects have already been seen. Otherwise the given function is called and `false` is
	// returned.
	//
	// This function is used internally when traversing objects and arrays to avoid getting stuck in
	// infinite loops when circular objects are encountered. It should be wrapped around all recursive
	// function calls where a circular object may be encountered. See `Basis.eq` for an example.
	//
	// o1 - The first object to check for recursion.
	// o2 - The paired object to check for recursion (default: `undefined`).
	// f  - A function that make the recursive funciton call.
	//
	// Returns `true` if recursion on the given objects has been detected. If the given pair of objects
	//   has yet to be seen, calls `f` and returns `false`.
	exports.detectRecursion = detectRecursion;

	// Public: Returns a string indicating the type of the given object. This can be considered an
	// enhanced version of the javascript `typeof` operator.
	//
	// Examples
	//
	//   Basis.type([])       // => 'array'
	//   Basis.type({})       // => 'object'
	//   Basis.type(9)        // => 'number'
	//   Basis.type(/fo*/)    // => 'regexp'
	//   Basis.type(new Date) // => 'date'
	//
	// o - The object to get the type of.
	//
	// Returns a string indicating the object's type.
	exports.type = type;

	// Public: Performs an object equality test. If the first argument is a `Basis.Object` then it is
	// sent the `eq` method, otherwise custom equality code is run based on the object type.
	//
	// a - Any object.
	// b - Any object.
	//
	// Returns `true` if the objects are equal and `false` otherwise.
	exports.eq = eq;

	// Public: Performs a a deep array equality test.
	//
	// a - An Array object.
	// b - An Array object.
	//
	// Returns `true` if the objects are equal and `false` otherwise.
	exports.arrayEq = arrayEq;

	// Public: Performs a a deep object equality test.
	//
	// a - Any object.
	// b - Any object.
	//
	// Returns `true` if the objects are equal and `false` otherwise.
	exports.objectEq = objectEq;

	// Public: Converts the given string to CamelCase.
	exports.camelize = camelize;

	// Public: Converts the given string to under_score_case.
	exports.underscore = underscore;

	// Public: Capitalizes the first letter of the given string.
	exports.capitalize = capitalize;

	// Public: Resolves a path into a value. The path must be relative to the given object.
	//
	// o    - The object to resolve the path from.
	// path - A string containing the dot separated path to resolve.
	//
	// Returns the resolved value or `undefined` if some segment of the path does not exist.
	exports.getPath = getPath;
	var toString = Object.prototype.toString;

	var seenObjects = [];

	// Internal: Used by `detectRecursion` to check to see if the given pair of objects has been
	// encountered yet on a previous recursive call.
	//
	// o1 - The first object to check for recursion.
	// o2 - The paired object to check for recursion.
	//
	// Returns `true` if the pair has been seen previously and `false` otherwise.
	function seen(o1, o2) {
	  var i, len;

	  for (i = 0, len = seenObjects.length; i < len; i++) {
	    if (seenObjects[i][0] === o1 && seenObjects[i][1] === o2) {
	      return true;
	    }
	  }

	  return false;
	}

	// Internal: Used by `detectRecursion` to mark the given pair of objects as seen before recursing.
	//
	// o1 - The first object to mark.
	// o2 - The paired object to mark.
	//
	// Returns nothing.
	function mark(o1, o2) {
	  seenObjects.push([o1, o2]);
	}

	// Internal: Used by `detectRecursion` to unmark the given pair of objects after a recursive call
	// has completed.
	//
	// o1 - The first object to unmark.
	// o2 - The paired object to unmark.
	//
	// Returns nothing.
	function unmark(o1, o2) {
	  var i, n;

	  for (i = 0, n = seenObjects.length; i < n; i++) {
	    if (seenObjects[i][0] === o1 && seenObjects[i][1] === o2) {
	      seenObjects.splice(i, 1);
	      return;
	    }
	  }
	}

	// Internal: Used by `getPath` to resolve a path into a value.
	//
	// o            - The object to resolve the path from.
	// pathSegments - An array of strings representing segments of the path to resolve.
	//
	// Returns the resolved value or `undefined` if some segment of the path does not exist.
	function _getPath(_x, _x2) {
	  var _again = true;

	  _function: while (_again) {
	    _again = false;
	    var o = _x,
	        pathSegments = _x2;
	    head = tail = undefined;

	    if (o == null) {
	      return undefined;
	    }

	    var head = pathSegments[0],
	        tail = pathSegments.slice(1);
	    o = o[head];

	    if (!tail.length) {
	      return o;
	    } else {
	      if (o) {
	        _x = o;
	        _x2 = tail;
	        _again = true;
	        continue _function;
	      } else {
	        return undefined;
	      }
	    }
	  }
	}
	function detectRecursion(o1, o2, f) {
	  if (arguments.length === 2) {
	    f = o2;o2 = undefined;
	  }

	  if (seen(o1, o2)) {
	    return true;
	  } else {
	    mark(o1, o2);
	    try {
	      f();
	    } finally {
	      unmark(o1, o2);
	    }
	    return false;
	  }
	}

	;
	function type(o) {
	  if (o === null) {
	    return "null";
	  }
	  if (o === undefined) {
	    return "undefined";
	  }

	  switch (toString.call(o)) {
	    case "[object Array]":
	      return "array";
	    case "[object Arguments]":
	      return "arguments";
	    case "[object Function]":
	      return "function";
	    case "[object String]":
	      return "string";
	    case "[object Number]":
	      return "number";
	    case "[object Boolean]":
	      return "boolean";
	    case "[object Date]":
	      return "date";
	    case "[object RegExp]":
	      return "regexp";
	    case "[object Object]":
	      if (o.hasOwnProperty("callee")) {
	        return "arguments";
	      } // ie fallback
	      else {
	        return "object";
	      }
	  }

	  return "unknown";
	}

	;
	function eq(a, b) {
	  var atype, btype;

	  // identical objects are equal
	  if (a === b) {
	    return true;
	  }

	  // if the first argument is a Basis.Object, delegate to its `eq` method
	  if (a && a.objectId && typeof a.eq === "function") {
	    return a.eq(b);
	  }

	  atype = type(a);
	  btype = type(b);

	  // native objects that are not of the same type are not equal
	  if (atype !== btype) {
	    return false;
	  }

	  switch (atype) {
	    case "boolean":
	    case "string":
	    case "date":
	    case "number":
	      return a.valueOf() === b.valueOf();
	    case "regexp":
	      return a.source === b.source && a.global === b.global && a.multiline === b.multiline && a.ignoreCase === b.ignoreCase;
	    case "array":
	      return arrayEq(a, b);
	    case "object":
	      return objectEq(a, b);
	    default:
	      return false;
	  }
	}

	function arrayEq(a, b) {
	  var r;

	  if (!Array.isArray(a) || !Array.isArray(b)) {
	    return false;
	  }

	  if (a.length !== b.length) {
	    return false;
	  }

	  r = true;

	  detectRecursion(a, b, function () {
	    var i, len;

	    for (i = 0, len = a.length; i < len; i++) {
	      if (!eq(a[i], b[i])) {
	        r = false;break;
	      }
	    }
	  });

	  return r;
	}

	function objectEq(a, b) {
	  var akeys = Object.keys(a),
	      bkeys = Object.keys(b),
	      r;

	  if (akeys.length !== bkeys.length) {
	    return false;
	  }

	  r = true;

	  detectRecursion(a, b, function () {
	    var i, len, key;

	    for (i = 0, len = akeys.length; i < len; i++) {
	      key = akeys[i];
	      if (!b.hasOwnProperty(key)) {
	        r = false;break;
	      }
	      if (!eq(a[key], b[key])) {
	        r = false;break;
	      }
	    }
	  });

	  return r;
	}

	function camelize(s) {
	  return typeof s === "string" ? s.replace(/(?:[-_])(\w)/g, function (_, c) {
	    return c ? c.toUpperCase() : "";
	  }) : s;
	}

	function underscore(s) {
	  return typeof s === "string" ? s.replace(/([a-z\d])([A-Z]+)/g, "$1_$2").replace(/[-\s]+/g, "_").toLowerCase() : s;
	}

	function capitalize(s) {
	  return typeof s === "string" && s.length ? s[0].toUpperCase() + s.slice(1) : s;
	}

	function getPath(o, path) {
	  return _getPath(o, path.split("."));
	}

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	// Public: Parses a string containing a number.
	//
	// s - The string to parse.
	//
	// Returns a number or `null` if parsing fails.
	exports.parseNumber = parseNumber;

	// Public: Parses a string containing a percent.
	//
	// s - The string to parse.
	//
	// Returns a number or `null` if parsing fails.
	exports.parsePercent = parsePercent;

	// Public: Parses a string containing a date in the following formats:
	//   - YYYY-MM-DD (ISO8601)
	//   - MM/DD
	//   - MM/DD/YY
	//   - MM/DD/YYYY
	//
	// s - The string to parse.
	//
	// Returns a `Date` or `null` if parsing fails.
	exports.parseDate = parseDate;

	// Public: Parses a string containing an ISO8601 formatted date and time.
	//
	// s - The string to parse.
	//
	// Returns a `Date` or `null` if parsing fails.
	exports.parseDateTime = parseDateTime;

	// Public: Parses a string containing an email.
	//
	// s - The string to parse.
	//
	// Returns the email string.
	exports.parseEmail = parseEmail;

	// Public: Parses a string containing an phone number.
	//
	// s - The string to parse.
	//
	// Returns the phone string.
	exports.parsePhone = parsePhone;

	// Public: Parses a string containing a time duration. The format is: "HH:MM:SS" where hours and
	// minutes are optional.
	//
	// s - The string to parse.
	//
	// Returns the number of seconds or `null` if parsing fails.
	exports.parseDuration = parseDuration;
	var NUMBER_RE = /^[-]?([0-9]*[0-9][0-9]*(\.[0-9]+)?|[0]*\.[0-9]*[0-9][0-9]*)$/;
	function parseNumber(s) {
	  s = String(s).replace(/[^\d-.]/g, "").replace(/\.$/, "");
	  if (!s.match(NUMBER_RE)) {
	    return null;
	  }
	  return parseFloat(s, 10);
	}

	var MDY_DATE_RE = /^\s*(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\s*$/;
	var ISO8601_DATE_RE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
	function parsePercent(s) {
	  var n = parseNumber(String(s).replace("%", ""));
	  return n == null ? null : n / 100;
	}

	function parseDate(s) {
	  var m, d, y, date, parts;

	  s = String(s).replace(/\s/g, "");

	  if (parts = s.match(ISO8601_DATE_RE)) {
	    y = parseInt(parts[1], 10);
	    m = parseInt(parts[2], 10) - 1;
	    d = parseInt(parts[3], 10);
	    date = new Date(y, m, d);
	    return date.getMonth() === m ? date : null;
	  } else if (parts = s.match(MDY_DATE_RE)) {
	    m = parseInt(parts[1], 10) - 1;
	    d = parseInt(parts[2], 10);
	    y = parts[3] ? parseInt(parts[3], 10) : new Date().getFullYear();
	    if (0 <= y && y <= 68) {
	      y += 2000;
	    }
	    if (69 <= y && y <= 99) {
	      y += 1900;
	    }
	    date = new Date(y, m, d);
	    return date.getMonth() === m ? date : null;
	  } else {
	    return null;
	  }
	}

	var NO_TZ_RE = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?$/;
	function parseDateTime(s) {
	  var n;
	  s = String(s);
	  if (s.match(NO_TZ_RE)) {
	    s += "Z";
	  }
	  return (n = Date.parse(s)) ? new Date(n) : null;
	}

	var EMAIL_FORMAT = /^([^@\s]+)@([-a-z0-9]+\.+[a-z]{2,})$/i;
	function parseEmail(s) {
	  s = String(s);
	  return EMAIL_FORMAT.test(s) ? s : null;
	}

	var PHONE_FORMAT = /^\d{10}$/;
	var PHONE_CHARS = /[\(\)\s-]/g;
	function parsePhone(s) {
	  s = String(s);
	  return PHONE_FORMAT.test(s.replace(PHONE_CHARS, "")) ? s : null;
	}

	var DURATION_RE = /^\s*(?:(?::?\d+)|(?::?\d+:\d+)|(?:\d+:\d+:\d+))\s*$/;
	function parseDuration(s) {
	  s = String(s);

	  if (!DURATION_RE.test(s)) {
	    return null;
	  }

	  var parts = s.split(":").map(function (p) {
	    return +p;
	  });

	  if (parts.length === 3) {
	    return parts[0] * 3600 + parts[1] * 60 + parts[2];
	  } else if (parts.length === 2) {
	    return parts[0] * 60 + parts[1];
	  } else {
	    return parts[0];
	  }
	}

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	(function (root, pluralize) {
	  /* istanbul ignore else */
	  if (true) {
	    // Node.
	    module.exports = pluralize();
	  } else if (typeof define === 'function' && define.amd) {
	    // AMD, registers as an anonymous module.
	    define(function () {
	      return pluralize();
	    });
	  } else {
	    // Browser global.
	    root.pluralize = pluralize();
	  }
	})(this, function () {
	  // Rule storage - pluralize and singularize need to be run sequentially,
	  // while other rules can be optimized using an object for instant lookups.
	  var pluralRules      = [];
	  var singularRules    = [];
	  var uncountables     = {};
	  var irregularPlurals = {};
	  var irregularSingles = {};

	  /**
	   * Title case a string.
	   *
	   * @param  {string} str
	   * @return {string}
	   */
	  function toTitleCase (str) {
	    return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
	  }

	  /**
	   * Sanitize a pluralization rule to a usable regular expression.
	   *
	   * @param  {(RegExp|string)} rule
	   * @return {RegExp}
	   */
	  function sanitizeRule (rule) {
	    if (typeof rule === 'string') {
	      return new RegExp('^' + rule + '$', 'i');
	    }

	    return rule;
	  }

	  /**
	   * Pass in a word token to produce a function that can replicate the case on
	   * another word.
	   *
	   * @param  {string}   word
	   * @param  {string}   token
	   * @return {Function}
	   */
	  function restoreCase (word, token) {
	    // Upper cased words. E.g. "HELLO".
	    if (word === word.toUpperCase()) {
	      return token.toUpperCase();
	    }

	    // Title cased words. E.g. "Title".
	    if (word[0] === word[0].toUpperCase()) {
	      return toTitleCase(token);
	    }

	    // Lower cased words. E.g. "test".
	    return token.toLowerCase();
	  }

	  /**
	   * Interpolate a regexp string.
	   *
	   * @param  {[type]} str  [description]
	   * @param  {[type]} args [description]
	   * @return {[type]}      [description]
	   */
	  function interpolate (str, args) {
	    return str.replace(/\$(\d{1,2})/g, function (match, index) {
	      return args[index] || '';
	    });
	  }

	  /**
	   * Sanitize a word by passing in the word and sanitization rules.
	   *
	   * @param  {String}   word
	   * @param  {Array}    collection
	   * @return {String}
	   */
	  function sanitizeWord (word, collection) {
	    // Empty string or doesn't need fixing.
	    if (!word.length || uncountables.hasOwnProperty(word)) {
	      return word;
	    }

	    var len = collection.length;

	    // Iterate over the sanitization rules and use the first one to match.
	    while (len--) {
	      var rule = collection[len];

	      // If the rule passes, return the replacement.
	      if (rule[0].test(word)) {
	        return word.replace(rule[0], function (match, index, word) {
	          var result = interpolate(rule[1], arguments);

	          if (match === '') {
	            return restoreCase(word[index - 1], result);
	          }

	          return restoreCase(match, result);
	        });
	      }
	    }

	    return word;
	  }

	  /**
	   * Replace a word with the updated word.
	   *
	   * @param  {Object}   replaceMap
	   * @param  {Object}   keepMap
	   * @param  {Array}    rules
	   * @return {Function}
	   */
	  function replaceWord (replaceMap, keepMap, rules) {
	    return function (word) {
	      // Get the correct token and case restoration functions.
	      var token = word.toLowerCase();

	      // Check against the keep object map.
	      if (keepMap.hasOwnProperty(token)) {
	        return restoreCase(word, token);
	      }

	      // Check against the replacement map for a direct word replacement.
	      if (replaceMap.hasOwnProperty(token)) {
	        return restoreCase(word, replaceMap[token]);
	      }

	      // Run all the rules against the word.
	      return sanitizeWord(word, rules);
	    };
	  }

	  /**
	   * Pluralize or singularize a word based on the passed in count.
	   *
	   * @param  {String}  word
	   * @param  {Number}  count
	   * @param  {Boolean} inclusive
	   * @return {String}
	   */
	  function pluralize (word, count, inclusive) {
	    var pluralized = count === 1 ?
	      pluralize.singular(word) : pluralize.plural(word);

	    return (inclusive ? count + ' ' : '') + pluralized;
	  }

	  /**
	   * Pluralize a word.
	   *
	   * @type {Function}
	   */
	  pluralize.plural = replaceWord(
	    irregularSingles, irregularPlurals, pluralRules
	  );

	  /**
	   * Singularize a word.
	   *
	   * @type {Function}
	   */
	  pluralize.singular = replaceWord(
	    irregularPlurals, irregularSingles, singularRules
	  );

	  /**
	   * Add a pluralization rule to the collection.
	   *
	   * @param {(string|RegExp)} rule
	   * @param {string}          replacement
	   */
	  pluralize.addPluralRule = function (rule, replacement) {
	    pluralRules.push([sanitizeRule(rule), replacement]);
	  };

	  /**
	   * Add a singularization rule to the collection.
	   *
	   * @param {(string|RegExp)} rule
	   * @param {string}          replacement
	   */
	  pluralize.addSingularRule = function (rule, replacement) {
	    singularRules.push([sanitizeRule(rule), replacement]);
	  };

	  /**
	   * Add an uncountable word rule.
	   *
	   * @param {(string|RegExp)} word
	   */
	  pluralize.addUncountableRule = function (word) {
	    if (typeof word === 'string') {
	      return uncountables[word.toLowerCase()] = true;
	    }

	    // Set singular and plural references for the word.
	    pluralize.addPluralRule(word, '$0');
	    pluralize.addSingularRule(word, '$0');
	  };

	  /**
	   * Add an irregular word definition.
	   *
	   * @param {String} single
	   * @param {String} plural
	   */
	  pluralize.addIrregularRule = function (single, plural) {
	    plural = plural.toLowerCase();
	    single = single.toLowerCase();

	    irregularSingles[single] = plural;
	    irregularPlurals[plural] = single;
	  };

	  /**
	   * Irregular rules.
	   */
	  [
	    // Pronouns.
	    ['I',        'we'],
	    ['me',       'us'],
	    ['he',       'they'],
	    ['she',      'they'],
	    ['them',     'them'],
	    ['myself',   'ourselves'],
	    ['yourself', 'yourselves'],
	    ['itself',   'themselves'],
	    ['herself',  'themselves'],
	    ['himself',  'themselves'],
	    ['themself', 'themselves'],
	    ['this',     'these'],
	    ['that',     'those'],
	    // Words ending in with a consonant and `o`.
	    ['echo', 'echoes'],
	    ['dingo', 'dingoes'],
	    ['volcano', 'volcanoes'],
	    ['tornado', 'tornadoes'],
	    ['torpedo', 'torpedoes'],
	    // Ends with `us`.
	    ['genus',  'genera'],
	    ['viscus', 'viscera'],
	    // Ends with `ma`.
	    ['stigma',   'stigmata'],
	    ['stoma',    'stomata'],
	    ['dogma',    'dogmata'],
	    ['lemma',    'lemmata'],
	    ['schema',   'schemata'],
	    ['anathema', 'anathemata'],
	    // Other irregular rules.
	    ['ox',      'oxen'],
	    ['axe',     'axes'],
	    ['die',     'dice'],
	    ['yes',     'yeses'],
	    ['foot',    'feet'],
	    ['eave',    'eaves'],
	    ['goose',   'geese'],
	    ['tooth',   'teeth'],
	    ['quiz',    'quizzes'],
	    ['human',   'humans'],
	    ['proof',   'proofs'],
	    ['carve',   'carves'],
	    ['valve',   'valves'],
	    ['thief',   'thieves'],
	    ['genie',   'genies'],
	    ['groove',  'grooves'],
	    ['pickaxe', 'pickaxes'],
	    ['whiskey', 'whiskies']
	  ].forEach(function (rule) {
	    return pluralize.addIrregularRule(rule[0], rule[1]);
	  });

	  /**
	   * Pluralization rules.
	   */
	  [
	    [/s?$/i, 's'],
	    [/([^aeiou]ese)$/i, '$1'],
	    [/(ax|test)is$/i, '$1es'],
	    [/(alias|[^aou]us|tlas|gas|ris)$/i, '$1es'],
	    [/(e[mn]u)s?$/i, '$1s'],
	    [/([^l]ias|[aeiou]las|[emjzr]as|[iu]am)$/i, '$1'],
	    [/(alumn|syllab|octop|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, '$1i'],
	    [/(alumn|alg|vertebr)(?:a|ae)$/i, '$1ae'],
	    [/(seraph|cherub)(?:im)?$/i, '$1im'],
	    [/(her|at|gr)o$/i, '$1oes'],
	    [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|automat|quor)(?:a|um)$/i, '$1a'],
	    [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|\w+hedr)(?:a|on)$/i, '$1a'],
	    [/sis$/i, 'ses'],
	    [/(?:(i)fe|(ar|l|ea|eo|oa|hoo)f)$/i, '$1$2ves'],
	    [/([^aeiouy]|qu)y$/i, '$1ies'],
	    [/([^ch][ieo][ln])ey$/i, '$1ies'],
	    [/(x|ch|ss|sh|zz)$/i, '$1es'],
	    [/(matr|cod|mur|sil|vert|ind|append)(?:ix|ex)$/i, '$1ices'],
	    [/(m|l)(?:ice|ouse)$/i, '$1ice'],
	    [/(pe)(?:rson|ople)$/i, '$1ople'],
	    [/(child)(?:ren)?$/i, '$1ren'],
	    [/eaux$/i, '$0'],
	    [/m[ae]n$/i, 'men']
	  ].forEach(function (rule) {
	    return pluralize.addPluralRule(rule[0], rule[1]);
	  });

	  /**
	   * Singularization rules.
	   */
	  [
	    [/s$/i, ''],
	    [/(ss)$/i, '$1'],
	    [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(?:sis|ses)$/i, '$1sis'],
	    [/(^analy)(?:sis|ses)$/i, '$1sis'],
	    [/([^aeflor])ves$/i, '$1fe'],
	    [/(hive|tive|dr?ive)s$/i, '$1'],
	    [/(ar|(?:wo|[ae])l|[eo][ao])ves$/i, '$1f'],
	    [/([^aeiouy]|qu)ies$/i, '$1y'],
	    [/(^[pl]|zomb|^(?:neck)?t|[aeo][lt]|cut)ies$/i, '$1ie'],
	    [/([^c][eor]n|smil)ies$/i, '$1ey'],
	    [/(m|l)ice$/i, '$1ouse'],
	    [/(seraph|cherub)im$/i, '$1'],
	    [/(x|ch|ss|sh|zz|tto|go|cho|alias|[^aou]us|tlas|gas|(?:her|at|gr)o|ris)(?:es)?$/i, '$1'],
	    [/(e[mn]u)s?$/i, '$1'],
	    [/(movie|twelve)s$/i, '$1'],
	    [/(cris|test|diagnos)(?:is|es)$/i, '$1is'],
	    [/(alumn|syllab|octop|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, '$1us'],
	    [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|automat|quor)a$/i, '$1um'],
	    [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|\w+hedr)a$/i, '$1on'],
	    [/(alumn|alg|vertebr)ae$/i, '$1a'],
	    [/(cod|mur|sil|vert|ind)ices$/i, '$1ex'],
	    [/(matr|append)ices$/i, '$1ix'],
	    [/(pe)(rson|ople)$/i, '$1rson'],
	    [/(child)ren$/i, '$1'],
	    [/(eau)x?$/i, '$1'],
	    [/men$/i, 'man']
	  ].forEach(function (rule) {
	    return pluralize.addSingularRule(rule[0], rule[1]);
	  });

	  /**
	   * Uncountable rules.
	   */
	  [
	    // Singular words with no plurals.
	    'advice',
	    'agenda',
	    'bison',
	    'bream',
	    'buffalo',
	    'carp',
	    'chassis',
	    'cod',
	    'cooperation',
	    'corps',
	    'digestion',
	    'debris',
	    'diabetes',
	    'energy',
	    'equipment',
	    'elk',
	    'excretion',
	    'expertise',
	    'flounder',
	    'gallows',
	    'graffiti',
	    'headquarters',
	    'health',
	    'herpes',
	    'highjinks',
	    'homework',
	    'information',
	    'jeans',
	    'justice',
	    'kudos',
	    'labour',
	    'machinery',
	    'mackerel',
	    'media',
	    'mews',
	    'moose',
	    'news',
	    'pike',
	    'plankton',
	    'pliers',
	    'pollution',
	    'premises',
	    'rain',
	    'rice',
	    'salmon',
	    'scissors',
	    'series',
	    'sewage',
	    'shambles',
	    'shrimp',
	    'species',
	    'staff',
	    'swine',
	    'trout',
	    'tuna',
	    'whiting',
	    'wildebeest',
	    'wildlife',
	    // Regexes.
	    /pox$/i, // "chickpox", "smallpox"
	    /ois$/i,
	    /deer$/i, // "deer", "reindeer"
	    /fish$/i, // "fish", "blowfish", "angelfish"
	    /sheep$/i,
	    /measles$/i,
	    /[^aeiou]ese$/i // "chinese", "japanese"
	  ].forEach(pluralize.addUncountableRule);

	  return pluralize;
	});


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var IdMap = {
	  models: new Map(),

	  insert: function insert(model) {
	    var klass = model.constructor,
	        id = model.id,
	        map;

	    if (!(map = this.models.get(klass))) {
	      this.models.set(klass, map = new Map());
	    }

	    if (map.get(id)) {
	      throw new Error("IdMap.insert: model of type `" + klass + "` and id `" + id + "` has already been inserted");
	    }

	    map.set(id, model);

	    return this;
	  },

	  get: function get(klass, id) {
	    var map = this.models.get(klass);
	    return map && map.get(id);
	  },

	  "delete": function _delete(model) {
	    var map = this.models.get(model.constructor);
	    if (!map) {
	      return this;
	    }
	    map["delete"](model.id);
	    return this;
	  },

	  clear: function clear() {
	    this.models.clear();return this;
	  }
	};

	module.exports = IdMap;

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

	var BasisArray = _interopRequire(__webpack_require__(2));

	var util = _interopRequireWildcard(__webpack_require__(5));

	var parsers = _interopRequireWildcard(__webpack_require__(6));

	function isBlank(v) {
	  return v == null || util.type(v) === "string" && v.match(/^\s*$/) || util.type(v) === "array" && v.length === 0 || v instanceof BasisArray && v.length === 0;
	}

	var Validations = {
	  "static": {
	    // Public: Adds a validator to the model that checks the given attributes for presence.
	    //
	    // ...names - One or more attribute names.
	    // opts     - An optional object containing zero or more of the following options:
	    //   if - A function that determines whether presence is required. If this returns false, then the
	    //        presence validator will not run.
	    //
	    // Returns the receiver.
	    validatesPresence: function validatesPresence() {
	      var names = Array.from(arguments),
	          opts = util.type(names[names.length - 1]) === "object" ? names.pop() : {};

	      names.forEach(function (name) {
	        this.validate(name, function () {
	          this.validatePresence(name, opts);
	        });
	      }, this);

	      return this;
	    },

	    // Public: Adds a validator to the model that checks to make sure the given attributes are valid
	    // numbers.
	    //
	    // ...names - One or more attribute names.
	    // opts     - An optional object containing zero or more of the following options:
	    //   nonnegative - Ensure that the number is not negative.
	    //   maximum     - Ensure that the number is not greater than this value.
	    //   minimum     - Ensure that the number is not less than this value.
	    //
	    // Returns the receiver.
	    validatesNumber: function validatesNumber() {
	      var names = Array.from(arguments),
	          opts = util.type(names[names.length - 1]) === "object" ? names.pop() : {};

	      names.forEach(function (name) {
	        this.validate(name, function () {
	          this.validateNumber(name, opts);
	        });
	      }, this);

	      return this;
	    },

	    // Public: Adds a validator to the model that checks to make sure the given attributes are valid
	    // dates.
	    //
	    // ...names - One or more attribute names.
	    //
	    // Returns the receiver.
	    validatesDate: function validatesDate() {
	      Array.from(arguments).forEach(function (name) {
	        this.validate(name, function () {
	          this.validateDate(name);
	        });
	      }, this);
	    },

	    // Public: Adds a validator to the model that checks to make sure the given attributes are valid
	    // emails.
	    //
	    // ...names - One or more attribute names.
	    //
	    // Returns the receiver.
	    validatesEmail: function validatesEmail() {
	      Array.from(arguments).forEach(function (name) {
	        this.validate(name, function () {
	          this.validateEmail(name);
	        });
	      }, this);

	      return this;
	    },

	    // Public: Adds a validator to the model that checks to make sure the given attributes are valid
	    // phone numbers.
	    //
	    // ...names - One or more attribute names.
	    //
	    // Returns the receiver.
	    validatesPhone: function validatesPhone() {
	      Array.from(arguments).forEach(function (name) {
	        this.validate(name, function () {
	          this.validatePhone(name);
	        });
	      }, this);

	      return this;
	    },

	    // Public: Adds a validator to the model that checks to make sure the given attributes are valid
	    // durations.
	    //
	    // ...names - One or more attribute names.
	    //
	    // Returns the receiver.
	    validatesDuration: function validatesDuration() {
	      Array.from(arguments).forEach(function (name) {
	        this.validate(name, function () {
	          this.validateDuration(name);
	        });
	      }, this);

	      return this;
	    }
	  },

	  instance: {
	    validatePresence: function validatePresence(name) {
	      var opts = arguments[1] === undefined ? {} : arguments[1];

	      if (opts["if"] && !opts["if"].call(this)) {
	        return;
	      }
	      var v = this["" + name + "BeforeCoercion"] != null ? this["" + name + "BeforeCoercion"] : this[name];
	      if (isBlank(v)) {
	        this.addError(name, "must be present");
	      }
	    },

	    validateNumber: function validateNumber(name) {
	      var opts = arguments[1] === undefined ? {} : arguments[1];

	      if (util.type(this[name]) === "number") {
	        if (opts.nonnegative && this[name] < 0) {
	          this.addError(name, "must not be negative");
	        }

	        if (opts.maximum && this[name] > opts.maximum) {
	          this.addError(name, "may not be greater than " + opts.maximum);
	        }

	        if (opts.minimum && this[name] < opts.minimum) {
	          this.addError(name, "may not be less than " + opts.minimum);
	        }
	      } else if (!isBlank(this["" + name + "BeforeCoercion"])) {
	        this.addError(name, "is not a number");
	      }
	    },

	    validateDate: function validateDate(name) {
	      var v = this["" + name + "BeforeCoercion"];

	      if (!isBlank(v) && !(v instanceof Date) && !parsers.parseDate(v)) {
	        this.addError(name, "is not a date");
	      }
	    },

	    validateEmail: function validateEmail(name) {
	      var v = this["" + name + "BeforeCoercion"];

	      if (!isBlank(v) && !parsers.parseEmail(v)) {
	        this.addError(name, "is not an email");
	      }
	    },

	    validatePhone: function validatePhone(name) {
	      var v = this["" + name + "BeforeCoercion"];

	      if (!isBlank(v) && !parsers.parsePhone(v)) {
	        this.addError(name, "is not a phone number");
	      }
	    },

	    validateDuration: function validateDuration(name) {
	      var v = this["" + name + "BeforeCoercion"];

	      if (!isBlank(v) && !parsers.parseDuration(v)) {
	        this.addError(name, "is not a duration");
	      }
	    }
	  }
	};

	module.exports = Validations;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

	var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

	var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

	var parsers = _interopRequireWildcard(__webpack_require__(6));

	var IdentityAttr = exports.IdentityAttr = {
	  coerce: function coerce(v) {
	    return v;
	  },
	  serialize: function serialize(v) {
	    return v;
	  }
	};

	var StringAttr = exports.StringAttr = (function () {
	  function StringAttr() {
	    var opts = arguments[0] === undefined ? {} : arguments[0];

	    _classCallCheck(this, StringAttr);

	    this.opts = Object.assign({ trim: true }, opts);
	  }

	  _prototypeProperties(StringAttr, null, {
	    coerce: {
	      value: function coerce(v) {
	        v = v != null ? String(v) : v;
	        if (typeof v === "string" && this.opts.trim) {
	          v = v.trim();
	        }
	        return v;
	      },
	      writable: true,
	      configurable: true
	    },
	    serialize: {
	      value: function serialize(s) {
	        return s;
	      },
	      writable: true,
	      configurable: true
	    }
	  });

	  return StringAttr;
	})();

	var IntegerAttr = exports.IntegerAttr = {
	  coerce: function coerce(v) {
	    if (typeof v === "number") {
	      return Math.round(v);
	    } else if (typeof v === "string") {
	      var parsed = parsers.parseNumber(v);
	      return parsed ? Math.round(parsed) : parsed;
	    } else if (v === undefined) {
	      return undefined;
	    } else {
	      return null;
	    }
	  },

	  serialize: function serialize(n) {
	    return n;
	  }
	};

	var NumberAttr = exports.NumberAttr = {
	  coerce: function coerce(v) {
	    if (typeof v === "number") {
	      return v;
	    } else if (typeof v === "string") {
	      return parsers.parseNumber(v);
	    } else if (v === undefined) {
	      return undefined;
	    } else {
	      return null;
	    }
	  },

	  serialize: function serialize(n) {
	    return n;
	  }
	};

	var BooleanAttr = exports.BooleanAttr = {
	  coerce: function coerce(v) {
	    return v === undefined ? v : !!v;
	  },
	  serialize: function serialize(b) {
	    return b;
	  }
	};

	var DateAttr = exports.DateAttr = {
	  coerce: function coerce(v) {
	    if (v == null || v instanceof Date) {
	      return v;
	    }
	    if (typeof v === "number") {
	      return new Date(v);
	    }

	    if (typeof v !== "string") {
	      throw new Error("Basis.DateAttr#coerce: don't know how to coerce `" + v + "` to a Date");
	    }

	    return parsers.parseDate(v);
	  },

	  serialize: function serialize(date) {
	    return date instanceof Date ? date.toJSON().replace(/T.*$/, "") : date;
	  }
	};

	var DateTimeAttr = exports.DateTimeAttr = {
	  coerce: function coerce(v) {
	    if (v == null || v instanceof Date) {
	      return v;
	    }
	    if (typeof v === "number") {
	      return new Date(v);
	    }

	    if (typeof v !== "string") {
	      throw new Error("Basis.DateTimeAttr#coerce: don't know how to coerce `" + v + "` to a Date");
	    }

	    return parsers.parseDateTime(v);
	  },

	  serialize: function serialize(date) {
	    return date instanceof Date ? date.toJSON() : date;
	  }
	};
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

/***/ }
/******/ ])
});
;