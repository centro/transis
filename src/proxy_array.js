import BasisArray from "./array";

function onSplice(event, data) {
  this.__owner__.emit(`splice:${this.__name__}`, data);
}

function onEvent(event, data) {
  var [type, ns] = event.split(':');
  if ((type === 'change' || type === 'splice') && ns.indexOf('.') === -1) {
    this.__owner__.emit(`${type}:${this.__name__}.${ns}`, data);
  }
}

// Public: The `Basis.ProxyArray` is a subclass of `Basis.Array` that proxies events emitted on the
// array to an owner object.
var ProxyArray = BasisArray.extend('Basis.ProxyArray', function() {
  this.prototype.init = function(owner, name) {
    ProxyArray.__super__.init.call(this);

    this.__owner__ = owner;
    this.__name__  = name;

    this.on('splice', onSplice);
    this.on('*:*', onEvent);
  };
});

// Public: Creates a new `Basis.ProxyArray` from a regular `Basis.Array`.
//
// owner - The owner object where events observed on the array will be proxied to.
// name  - The name to use as a prefix on the proxied event namespace.
//
// Returns a new `Basis.ProxyArray` with the contents of the receiver.
BasisArray.prototype.proxy = function(owner, name) {
  return new ProxyArray(owner, name).replace(this);
};

export default ProxyArray;
