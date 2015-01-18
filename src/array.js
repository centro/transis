import RynoObject from "./object";
import * as util from "./util";

var {slice, splice} = Array.prototype;

function onElementEvent(event, data) {
  var ns = event.split(':')[1];
  this.emit(`elementChange:${ns}`, data);
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

  get length() { return this.__elements__.length; }

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

  eq(other) {
    if (other instanceof RynoArray) { return util.eq(this.__elements__, other.__elements__); }
    if (other instanceof Array) { return util.eq(this.__elements__, other); }
    return false;
  }

  splice(i, n) {
    var added = slice.call(arguments, 2), index = i < 0 ? this.length + i : i, removed, j, m;

    if (index < 0) {
      throw new Error(`Ryno.Array#splice: index ${i} is too small for ${this}`);
    }

    if (n === undefined) { n = this.length - index; }

    removed = splice.apply(this.__elements__, [index, n].concat(added));

    for (j = 0, m = removed.length; j < m; j++) {
      if (removed[j] instanceof RynoObject) {
        removed[j].off('change:*', onElementEvent, {observer: this});
      }
    }

    for (j = 0, m = added.length; j < m; j++) {
      if (added[j] instanceof RynoObject) {
        added[j].on('change:*', onElementEvent, {observer: this});
      }
    }

    this.emit('splice', {array: this, i: index, n, added, removed});

    return RynoArray.from(removed);
  }

  push() {
    var args = slice.call(arguments);
    this.splice.apply(this, [this.length, 0].concat(args));
    return this.length;
  }

  unshift() {
    var args = slice.call(arguments);
    this.splice.apply(this, [0, 0].concat(args));
    return this.length;
  }

  pop() { return this.length > 0 ? this.splice(-1, 1)[0] : undefined; }

  shift() {  return this.length > 0 ? this.splice(0, 1)[0] : undefined; }

  toString() {
    return `#<Ryno.Array:${this.objectId} [${this.__elements__}]>`;
  }
}

export default RynoArray;
