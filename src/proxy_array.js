import BasisObject from "./object";
import BasisArray from "./array";

// Public: The `Basis.ProxyArray` is a subclass of `Basis.Array` that proxies prop change
// notifications an owner object.
var ProxyArray = BasisArray.extend('Basis.ProxyArray', function() {
  // Public: The `Basis.ProxyArray` constructor.
  //
  // owner    - The owner object where prop change notifications are proxied to.
  // name     - The prefix to use for prop names.
  // elements - A native array containing the initial contents.
  this.prototype.init = function(owner, name, elements = []) {
    ProxyArray.__super__.init.apply(this, elements);

    this.__owner__ = owner;
    this.__name__  = name;

    for (let i = 0, n = this.length; i < n; i++) {
      if (this.at(i) instanceof BasisObject) {
        this.at(i)._registerProxy(this.__owner__, this.__name__);
      }
    }
  };

  this.prototype._splice = function(i, n, added) {
    var removed = ProxyArray.__super__._splice.call(this, i, n, added),
        removedNative = removed.native;

    for (let i = 0, n = removedNative.length; i < n; i++) {
      if (removedNative[i] instanceof BasisObject) {
        removedNative[i]._deregisterProxy(this.__owner__, this.__name__);
      }
    }

    for (let i = 0, n = added.length; i < n; i++) {
      if (added[i] instanceof BasisObject) {
        added[i]._registerProxy(this.__owner__, this.__name__);
      }
    }

    return removed;
  };

  this.prototype.didChange = function(prop) {
    ProxyArray.__super__.didChange.call(this, prop);
    if (prop === '@') { this.__owner__.didChange(this.__name__); }
  };
});

// Public: Creates a new `Basis.ProxyArray` from a regular `Basis.Array`.
//
// owner - The owner object where events observed on the array will be proxied to.
// name  - The name to use as a prefix on the proxied event namespace.
//
// Returns a new `Basis.ProxyArray` with the contents of the receiver.
BasisArray.prototype.proxy = function(owner, name) {
  return new ProxyArray(owner, name, this.native)
};

export default ProxyArray;
