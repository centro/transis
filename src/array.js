import RynoObject from "./object";
import * as util from "./util";

var {slice, splice, concat} = Array.prototype;

function onElementChange(event, data) {
  var ns = event.split(':')[1];
  this.emit(`elementChange:${ns}`, Object.assign({array: this}, data));
}

class RynoArray extends RynoObject {
  // Public: Returns a new `Ryno.Array` containing the given arguments as contents.
  //
  // Returns a new `Ryno.Array`.
  static A() {
    var a = new RynoArray;
    a.push.apply(a, arguments);
    return a;
  }

  // Public: Returns a new `Ryno.Array` containing the contents of the given array-like object.
  //
  // a - Any array-like object (a native array, `Arguments` object, or `Ryno.Array` instance).
  //
  // Returns a new `Ryno.Array`.
  static from(a) {
    var b = new RynoArray(a.length), i, n;
    if (a instanceof RynoArray) { a = a.__elements__; }
    for (i = 0, n = a.length; i < n; i++) { b.__elements__[i] = a[i]; }
    return b;
  }

  // Public: Wraps a native array with a `Ryno.Array`.
  //
  // a - A native array object.
  //
  // Returns a new `Ryno.Array`.
  static wrap(a) {
    if (!Array.isArray(a)) {
      throw new TypeError(`Ryno.Array.wrap: expected a native array but received \`${a}\` instead`);
    }

    var b = new RynoArray;
    b.__elements__ = a;
    return b;
  }

  // Public: The `Ryno.Array` constructor. With a single number argument, an array is created with
  // the same length. In every other case, the array is initialized with the given arguments.
  constructor() {
    var elements = slice.call(arguments), i, n;

    if (elements.length === 1 && typeof elements[0] === 'number') {
      this.__elements__ = new Array(elements[0]);
    }
    else {
      this.__elements__ = elements;

      for (i = 0, n = elements.length; i < n; i++) {
        if (elements[i] instanceof RynoObject) {
          elements[i].on('change:*', onElementEvent, {observer: this});
        }
      }
    }

    super();
  }

  // Public: Returns the current length of the array.
  get length() { return this.__elements__.length; }

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
  at(i, v) {
    var length = this.length;

    if (i < 0) { i = length + i; }

    if (arguments.length === 1) {
      return (i >= 0 && i < length) ? this.__elements__[i] : undefined;
    }
    else {
      this.splice(i, 1, v);
      return v;
    }
  }

  // Public: `Ryno.Array` equality test. This method performs an element-wise comparison between the
  // receiver and the given array.
  //
  // other - A `Ryno.Array` or native array to compare to the receiver.
  //
  // Returns `true` if the arrays are equal and `false` otherwise.
  eq(other) {
    if (other instanceof RynoArray) { return util.eq(this.__elements__, other.__elements__); }
    if (other instanceof Array) { return util.eq(this.__elements__, other); }
    return false;
  }

  // Public: Array mutator. All mutations made to an array (pushing, popping, assignment, etc.) are
  // made through this method. In addition to making the mutation, this method also emits `splice`
  // events.
  //
  // The `splice` events contain the array that was mutated, the index at which the mutation starts,
  // the number of elements removed, and native arrays containing the removed and added elements.
  //
  // i        - The index to start the mutation, may be negative.
  // n        - The number of items to remove, starting from `i`. If not given, then all items
  //            starting from `i` are removed.
  // ...items - Zero or more items to add to the array, starting at index `i`.
  //
  // Returns a new `Ryno.Array` containing the elements removed.
  // Throws `Error` when given an index that is out of range.
  splice(i, n) {
    var added = slice.call(arguments, 2), index = i < 0 ? this.length + i : i, removed, j, m;

    if (index < 0) {
      throw new Error(`Ryno.Array#splice: index ${i} is too small for ${this}`);
    }

    if (n === undefined) { n = this.length - index; }

    removed = splice.apply(this.__elements__, [index, n].concat(added));

    for (j = 0, m = removed.length; j < m; j++) {
      if (removed[j] instanceof RynoObject) {
        removed[j].off('change:*', onElementChange, {observer: this});
      }
    }

    for (j = 0, m = added.length; j < m; j++) {
      if (added[j] instanceof RynoObject) {
        added[j].on('change:*', onElementChange, {observer: this});
      }
    }

    this.emit('splice', {array: this, i: index, n, added, removed});

    return RynoArray.from(removed);
  }

  // Public: Adds one or more elements to the end of the array and returns the new length.
  //
  // ...elements - One or more objects to add to the end of the array.
  //
  // Returns the new length of the array.
  push() {
    var args = slice.call(arguments);
    this.splice.apply(this, [this.length, 0].concat(args));
    return this.length;
  }

  // Public: Adds one or more elements to the beginning of the array and returns the new length.
  //
  // ...elements - One or more objects to add to the beginning of the array.
  //
  // Returns the new length of the array.
  unshift() {
    var args = slice.call(arguments);
    this.splice.apply(this, [0, 0].concat(args));
    return this.length;
  }

  // Public: Removes the last element from the array and returns the element.
  //
  // Returns the last element in the array or `undefined` if the array length is 0.
  pop() { return this.length > 0 ? this.splice(-1, 1).at(0) : undefined; }

  // Public: Removes the first element from the array and returns the element.
  //
  // Returns the first element in the array or `undefined` if the array length is 0.
  shift() { return this.length > 0 ? this.splice(0, 1).at(0) : undefined; }

  // Public: Returns a new `Ryno.Array` comprised of the receiver joined with the array(s) or
  // value(s) provided as arguments.
  //
  // ...value - Arrays or values to concatenate into the new array.
  //
  // Returns a new `Basis.Array`.
  concat() {
    var args = slice.call(arguments).map(function(arg) {
      return arg instanceof RynoArray ? arg.__elements__ : arg;
    });

    return RynoArray.wrap(concat.apply(this.__elements__, args));
  }

  toString() {
    return `#<Ryno.Array:${this.objectId} [${this.__elements__}]>`;
  }
}

export default RynoArray;
