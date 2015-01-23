import BasisArray from "./array";

function onSplice(event, {array, i, n, added, removed}) {
  var desc = this.__desc__, inverse = desc.inverse, name = desc.name, changes, i;

  if (inverse && !this.__handlingInverse__) {
    removed.forEach(function(model) {
      model._inverseRemoved(inverse, this.__owner__);
    }, this);

    added.forEach(function(model) {
      model._inverseAdded(inverse, this.__owner__);
    }, this);
  }

  if (desc.owner) {
    changes = this.__owner__.changes[name] =
      this.__owner__.changes[name] || {added: [], removed: []};

    added.forEach((m) => {
      if ((i = changes.removed.indexOf(m)) !== -1) {
        changes.removed.splice(i, 1);
      }
      else if (changes.added.indexOf(m) === -1) {
        changes.added.push(m);
      }
    });

    removed.forEach((m) => {
      if ((i = changes.added.indexOf(m)) !== -1) {
        changes.added.splice(i, 1);
      }
      else if (changes.removed.indexOf(m) === -1) {
        changes.removed.push(m);
      }
    });

    if (!changes.added.length && !changes.removed.length) {
      delete this.__owner__.changes[name];
    }
  }

  this.__owner__.emit(`splice:${desc.name}`, {array, i, n, added, removed});
}

function onChange(event, data) {
  var ns = event.split(':')[1], desc = this.__desc__;
  if (ns.indexOf('.') >= 0) { return; }
  this.__owner__.emit(`change:${desc.name}.${ns}`, data);
}

function checkAssociatedType(o) {
  var owner = this.__owner__, desc = this.__desc__, klass = desc.klass;

  if (!(o instanceof klass)) {
    throw new Error(`${owner.constructor}#${desc.name}: expected an object of type \`${klass}\` but received \`${o}\` instead`);
  }
}

class HasManyArray extends BasisArray {
  constructor(owner, desc) {
    super();
    this.__owner__ = owner;
    this.__desc__ = desc;
    this.on('splice', onSplice);
    this.on('change:*', onChange);
  }

  splice() {
    var added = Array.from(arguments).slice(2);
    added.forEach((o) => checkAssociatedType.call(this, o));
    return super.splice.apply(this, arguments);
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
