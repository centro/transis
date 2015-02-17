import BasisObject from "./object";
import BasisArray from "./array";

// Public: The `Basis.ProxyArray` is a subclass of `Basis.Array` that proxies prop changes
// notifications an owner object.
var ProxyArray = BasisArray.extend('Basis.ProxyArray', function() {
  this.prototype.init = function(owner, name) {
    ProxyArray.__super__.init.call(this);

    this.__owner__ = owner;
    this.__name__  = name;
  };

  this.prototype._splice = function(i, n, added) {
    var removed = ProxyArray.__super__._splice.call(this, i, n, added),
        removedNative = removed.native;

    if (!this.__initing__) {
      this.__owner__.didChange(this.__name__);
    }

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
});

// Public: Creates a new `Basis.ProxyArray` from a regular `Basis.Array`.
//
// owner - The owner object where events observed on the array will be proxied to.
// name  - The name to use as a prefix on the proxied event namespace.
//
// Returns a new `Basis.ProxyArray` with the contents of the receiver.
BasisArray.prototype.proxy = function(owner, name) {
  var pa = new ProxyArray(owner, name)
  pa.__initing__ = true;
  pa.replace(this);
  delete pa.__initing__;
  return pa;
};

export default ProxyArray;
