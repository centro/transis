import Emitter from "./emitter";

var objectId = 0;

class RynoObject {
  // Public: Defines a property on the class's prototype. Properties defined with this method are
  // observable using the `Ryno.Object#on` method. When changed, they emit `change:<name>` events.
  // The object being changed and the old value of the property are passed along in the event.
  //
  // name - A string containing the name of the property.
  // opts - An object containing one or more of the following keys:
  //   get      - A custom property getter function.
  //   set      - A custom property setter function.
  //   readonly - Makes the property readonly. Should only be used with the `get` option.
  //   default  - Specify a default value for the property.
  //
  // Returns the receiver.
  static prop(name, opts = {}) {
    var descriptor = Object.assign({
      get: null,
      set: null,
      readonly: false,
      default: undefined
    }, opts);

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
  }

  constructor(props = {}) {
    for (let k in props) { if (k in this) { this[k] = props[k]; } }
  }

  // Public: Returns a number that can be used to uniquely identify the receiver object.
  get objectId() { return this.__objectId__ = this.__objectId__ || ++objectId; }

  // Public: Indicates whether the receiver is equal to the given object. The default implementation
  // simply does an identity comparison using the `===` operator. You'll likely want to override
  // this method in your sub-types in order to perform a more meaningful comparison.
  //
  // o - An object to compare against the receiver.
  //
  // Returns a `true` if the objects are equal and `false` otherwise.
  eq(other) { return this === other; }

  // Internal: Returns the current value of the given property or the default value if it is not
  // defined.
  //
  // Returns the value of the property.
  // Throws `Error` if there is no property with the given name.
  getProp(name) {
    var descriptor = this.__props__ && this.__props__[name], key = `__${name}`, value;

    if (!descriptor) {
      throw new Error(`Ryno.Object#getProp: unknown prop name \`${name}\``);
    }

    value = descriptor.get ? descriptor.get.call(this) : this[key];
    value = (value === undefined) ? descriptor.default : value;

    return value;
  }

  // Internal: Sets the value of the given property and emits a `change:<name>` event.
  //
  // Returns nothing.
  // Throws `Error` if there is no property with the given name.
  // Throws `TypeError` if the property is readonly.
  setProp(name, value) {
    var descriptor = this.__props__ && this.__props__[name],
        key        = `__${name}`,
        old        = this.getProp(name);

    if (!descriptor) {
      throw new Error(`Ryno.Object#setProp: unknown prop name \`${name}\``);
    }

    if (descriptor.readonly) {
      throw new TypeError(`Ryno.Object#setProp: cannot set readonly property \`${name}\` of ${this}`);
    }

    if (descriptor.set) { descriptor.set.call(this, value); }
    else { this[key] = value; }

    this.emit(`change:${name}`, {object: this, old});
  }
}

Object.assign(RynoObject.prototype, Emitter);

export default RynoObject;
