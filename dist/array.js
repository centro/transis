"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var BasisObject = _interopRequire(require("./object"));

var util = _interopRequireWildcard(require("./util"));

var iframe;

var BasisArray = (function () {
  // http://danielmendel.github.io/blog/2013/02/20/subclassing-javascript-arrays/

  if (typeof exports !== "undefined") {
    // node.js
    return require("vm").runInNewContext("Array");
  } else {
    // browser
    iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    frames[frames.length - 1].document.write("<script>parent._Array = Array;</script>");
    var _Array = window._Array;
    delete window._Array;
    document.body.removeChild(iframe);
    return _Array;
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
    return util.eq(this, other);
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

    return removed instanceof BasisArray ? removed : BasisArray.from(removed);
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
        index = i < 0 ? this.length + i : i,
        removed,
        j,
        m;

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
    var a = slice.apply(this, arguments);
    return a instanceof BasisArray ? a : BasisArray.from(a);
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
    var a = map.apply(this, arguments);
    return a instanceof BasisArray ? a : BasisArray.from(a);
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
    var a = filter.apply(this, arguments);
    return a instanceof BasisArray ? a : BasisArray.from(a);
  };

  // Public: Returns a new `Basis.Array` comprised of the receiver joined with the array(s) or
  // value(s) provided as arguments.
  //
  // ...value - Arrays or values to concatenate into the new array.
  //
  // Returns a new `Basis.Array`.
  this.prototype.concat = function () {
    var a = concat.apply(this, arguments);
    return a instanceof BasisArray ? a : BasisArray.from(a);
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
