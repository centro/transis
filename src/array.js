import RynoObject from "./object";

var {slice, splice} = Array.prototype;

function onElementEvent(event, data) {
  var ns = event.split(':')[1];
  this.emit(`elementChange:${ns}`, data);
}

class RynoArray extends RynoObject {
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

    return removed;
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
