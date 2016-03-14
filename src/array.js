import TransisObject from "./object";
import * as util from "./util";

var iframe;

var TransisArray = (function () {
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
  }
  else {
    // node.js
    return require("vm").runInNewContext("Array");
  }
})();

var {concat, slice, splice, map, filter} = TransisArray.prototype;

Object.assign(TransisArray, TransisObject);
Object.assign(TransisArray.prototype, TransisObject.prototype);

// Internal: Copy over polyfilled methods from `Array` to `Transis.Array`.
['findIndex', 'find'].forEach(function(x) {
  TransisArray.prototype[x] = Array.prototype[x];
});

// Public: Returns a new `Transis.Array` containing the given arguments as contents. This is the
// main `Transis.Array` constructor, never use the `Transis.Array` constructor function directly.
//
// ...elements - The elements to add to the array.
//
// Returns a new `Transis.Array`.
TransisArray.of = function() {
  var a = new TransisArray(arguments.length), i, n;
  TransisObject.call(a);
  for (i = 0, n = arguments.length; i < n; i++) { a[i] = arguments[i]; }
  return a;
};

// Public: Creates a new `Transis.Array` from the given array-like object. Useful for converting a
// regular array to a `Transis.Array`.
//
// a       - An array-like object.
// mapFn   - Map function to call on every element of the array (optional).
// thisArg - Value to use as this when executing mapFn (optional).
//
// Returns a new `Transis.Array`.
TransisArray.from = function(a, mapFn, thisArg) {
  let arr = TransisArray.of.apply(null, a);
  return mapFn ? arr.map(x => mapFn.call(thisArg || this, x)) : arr;
};

(function() {
  this.displayName = 'Transis.Array';

  this.prop('size', {get: function() { return this.length; }});
  this.prop('first', {get: function() { return this[0]; }});
  this.prop('@', {get: function() { return this; }});

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
  this.prototype.at = function(i, v) {
    var length = this.length;

    if (i < 0) { i = length + i; }

    if (arguments.length === 1) {
      return (i >= 0 && i < length) ? this[i] : undefined;
    }
    else {
      this.splice(i, 1, v);
      return v;
    }
  };

  // Public: `Transis.Array` equality test. This method performs an element-wise comparison between
  // the receiver and the given array.
  //
  // other - A `Transis.Array` or native array to compare to the receiver.
  //
  // Returns `true` if the arrays are equal and `false` otherwise.
  this.prototype.eq = function(other) { return util.arrayEq(this, other); };

  // Internal: Performs the actual splice. This method is called by `Array#splice` and is always
  // passed the number of elements to remove and an array of items to add whereas the `splice`
  // method is more flexible in the arguments that it accepts.
  this.prototype._splice = function(i, n, added) {
    var removed = splice.apply(this, [i, n].concat(added));

    if (n !== added.length) { this.didChange('size'); }
    if (i === 0) { this.didChange('first'); }
    this.didChange('@');

    if (this.__proxy__) {
      removed.forEach(function(x) {
        if (x instanceof TransisObject || x instanceof TransisArray) {
          x._deregisterProxy(this.__proxy__.to, this.__proxy__.name);
        }
      }, this);

      added.forEach(function(x) {
        if (x instanceof TransisObject || x instanceof TransisArray) {
          x._registerProxy(this.__proxy__.to, this.__proxy__.name);
        }
      }, this);

      this.__proxy__.to.didChange(this.__proxy__.name);
    }

    return TransisArray.from(removed);
  };

  // Public: Array mutator. All mutations made to an array (pushing, popping, assignment, etc.) are
  // made through this method.
  //
  // i        - The index to start the mutation, may be negative.
  // n        - The number of items to remove, starting from `i`. If not given, then all items
  //            starting from `i` are removed.
  // ...items - Zero or more items to add to the array, starting at index `i`.
  //
  // Returns a new `Transis.Array` containing the elements removed.
  // Throws `Error` when given an index that is out of range.
  this.prototype.splice = function(i, n) {
    var added = slice.call(arguments, 2), index = i < 0 ? this.length + i : i;

    if (index < 0) {
      throw new Error(`Transis.Array#splice: index ${i} is too small for ${this}`);
    }

    if (n === undefined) { n = this.length - index; }

    return this._splice(index, n, added);
  };

  // Public: Adds one or more elements to the end of the array and returns the new length.
  //
  // ...elements - One or more objects to add to the end of the array.
  //
  // Returns the new length of the array.
  this.prototype.push = function() {
    var args = slice.call(arguments);
    this.splice.apply(this, [this.length, 0].concat(args));
    return this.length;
  };

  // Public: Adds one or more elements to the beginning of the array and returns the new length.
  //
  // ...elements - One or more objects to add to the beginning of the array.
  //
  // Returns the new length of the array.
  this.prototype.unshift = function() {
    var args = slice.call(arguments);
    this.splice.apply(this, [0, 0].concat(args));
    return this.length;
  };

  // Public: Removes the last element from the array and returns the element.
  //
  // Returns the last element in the array or `undefined` if the array length is 0.
  this.prototype.pop = function() {
    return this.length > 0 ? this.splice(-1, 1).at(0) : undefined;
  };

  // Public: Removes the first element from the array and returns the element.
  //
  // Returns the first element in the array or `undefined` if the array length is 0.
  this.prototype.shift = function() {
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
  // Returns a new `Transis.Array`.
  this.prototype.slice = function() {
    return TransisArray.from(slice.apply(this, arguments));
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
  // Returns a new `Transis.Array`.
  this.prototype.map = function() {
    return TransisArray.from(map.apply(this, arguments));
  };

  // Public: Creates a new array with all elements that pass the test implemented by the provided
  // function.
  //
  // callback - Function to test each element of the array. Return true to keep the element and
  //            false to discard.
  // ctx      - Value to use as this when invoking callback.
  //
  // Returns a new `Transis.Array`.
  this.prototype.filter = function() {
    return TransisArray.from(filter.apply(this, arguments));
  };

  // Public: Returns a new `Transis.Array` comprised of the receiver joined with the array(s) or
  // value(s) provided as arguments.
  //
  // ...value - Arrays or values to concatenate into the new array.
  //
  // Returns a new `Transis.Array`.
  this.prototype.concat = function() {
    return TransisArray.from(concat.apply(this, arguments));
  };

  // Public: Replaces the contents of the receiver with the contents of the given array.
  //
  // a - A `Transis.Array` or native array.
  //
  // Returns the receiver.
  this.prototype.replace = function(a) {
    this.splice.apply(this, [0, this.length].concat(a));
    return this;
  };

  // Public: Clears the array by removing all elements.
  //
  // Returns the receiver.
  this.prototype.clear = function() {
    this.splice(0, this.length);
    return this;
  };

  // Public: Builds a new array that is the one-dimensional flattening of the receiver. In other
  // words, for every item that is itself an array, its items are added to the new array.
  //
  // Returns a new `Transis.Array` instance.
  this.prototype.flatten = function() {
    var a = TransisArray.of();

    for (let i = 0, n = this.length; i < n; i++) {
      let el = this[i];

      if (el instanceof TransisArray) {
        a = a.concat(el.flatten());
      }
      else if (Array.isArray(el)) {
        a = a.concat(TransisArray.from(el).flatten());
      }
      else {
        a.push(el);
      }
    }

    return a;
  };

  // Public: Returns a new array with `null` and `undefined` items removed.
  this.prototype.compact = function() {
    return this.reduce(function(acc, el) {
      if (el != null) { acc.push(el); }
      return acc;
    }, TransisArray.of());
  };

  // Public: Returns a new array containing only the unique items in the receiver.
  this.prototype.uniq = function() {
    var map = new Map;

    return this.reduce(function(acc, el) {
      if (!map.has(el)) { map.set(el, true); acc.push(el); }
      return acc;
    }, TransisArray.of());
  };

  // Public: Yields each set of consecutive `n` elements to the function as a native array.
  //
  // n - The number of consecutive elements to yield at a time.
  // f - The function to yield each consecutive set of elements to.
  //
  // Examples
  //
  //   Transis.A(1,2,3,4,5,6,7).forEachCons(2, console.log);
  //   // outputs:
  //   // [ 1, 2 ]
  //   // [ 2, 3 ]
  //   // [ 3, 4 ]
  //   // [ 4, 5 ]
  //   // [ 5, 6 ]
  //   // [ 6, 7 ]
  //
  // Returns nothing.
  this.prototype.forEachCons = function(n, f) {
    var a = [];

    this.forEach(function(el) {
      a.push(el);
      if (a.length > n) { a.shift(); }
      if (a.length === n) { f(a.slice(0)); }
    });
  };

  // Public: Yields each slice of `n` elements to the function as a native array.
  //
  // n - The size of each slice to yield.
  // f - The function to yield each slice to.
  //
  // Examples
  //
  //   Transis.A(1,2,3,4,5,6,7).forEachSlice(2, console.log);
  //   // outputs:
  //   // [ 1, 2 ]
  //   // [ 3, 4 ]
  //   // [ 5, 6 ]
  //   // [ 7 ]
  //
  // Returns the receiver.
  this.prototype.forEachSlice = function(n, f) {
    var a = [];

    this.forEach(function(el) {
      a.push(el);
      if (a.length === n) { f(a); a = []; }
    });

    if (a.length > 0) { f(a); }
  };

  // Public: Causes the array to begin proxying prop change notifications on itself as well as its
  // elements to the given proxy object.
  //
  // to   - The object to proxy prop changes to.
  // name - The name to use as a prefix on the proxied prop name.
  //
  // Returns the receiver.
  this.prototype.proxy = function(to, name) {
    if (this.__proxy__) { this.unproxy(); }

    this.__proxy__ = {to, name};

    this.forEach(function(x) {
      if (x instanceof TransisObject || x instanceof TransisArray) {
        x._registerProxy(to, name);
      }
    });

    return this;
  };

  // Public: Stop proxying prop changes.
  this.prototype.unproxy = function() {
    if (this.__proxy__) {
      this.forEach(function(x) {
        if (x instanceof TransisObject || x instanceof TransisArray) {
          x._deregisterProxy(this.__proxy__.to, this.__proxy__.name);
        }
      }, this);
      delete this.__proxy__;
    }

    return this;
  };

  // Public: Returns a string representation of the array.
  this.prototype.toString = function() {
    return `[${this.map(function(x) { return String(x); }).join(', ')}]`;
  };

  // Public: Removes element from array and returns the removed element.
  this.prototype.remove = function(el) {
    var index = this.indexOf(el);
    return index !== -1 ? this.splice(index, 1)[0] : null;
  };
}).call(TransisArray);

export default TransisArray;
