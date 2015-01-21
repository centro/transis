import RynoArray from "./array";

function onSplice(event, {array, i, n, added, removed}) {
  var inverse = this.__desc__.inverse;

  if (this.__handlingInverse__) { return; }

  removed.forEach(function(model) {
    model._inverseRemoved(inverse, this.__owner__);
  }, this);

  added.forEach(function(model) {
    model._inverseAdded(inverse, this.__owner__);
  }, this);
}

function checkAssociatedType(o) {
  var owner = this.__owner__, desc = this.__desc__, klass = desc.klass;

  if (!(o instanceof klass)) {
    throw new Error(`${owner.constructor}#${desc.name}: expected an object of type \`${klass}\` but received \`${o}\` instead`);
  }
}

class HasManyArray extends RynoArray {
  constructor(owner, desc) {
    super();
    this.__owner__ = owner;
    this.__desc__ = desc;
    if (desc.inverse) { this.on('splice', onSplice); }
  }

  splice() {
    var added = Array.from(arguments).slice(2);
    added.forEach((o) => checkAssociatedType.call(this, o));
    super.splice.apply(this, arguments);
  }

  _inverseAdd(model) {
    this.__handlingInverse__ = true;
    this.push(model);
    this.__handlingInverse__ = false;
  }

  _inverseRemove(model) {
    var i = this.indexOf(model);

    if (i >= 0) {
      this.__handlingInverse__ = true;
      this.splice(i, 1);
      this.__handlingInverse__ = false;
    }
  }
}

export default HasManyArray;
