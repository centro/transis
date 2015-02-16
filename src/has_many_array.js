import ProxyArray from "./proxy_array";

function processSplice(i, n, added, removed) {
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
      this.__owner__._clearChange(name);
    }
    else {
      this.__owner__._setChange(name, changes);
    }
  }
}

function checkAssociatedType(o) {
  var owner = this.__owner__, desc = this.__desc__, klass = desc.klass;

  if (!(o instanceof klass)) {
    throw new Error(`${owner.constructor}#${desc.name}: expected an object of type \`${klass}\` but received \`${o}\` instead`);
  }
}

var HasManyArray = ProxyArray.extend('Basis.HasManyArray', function() {
  this.prototype.init = function(owner, desc) {
    HasManyArray.__super__.init.call(this, owner, desc.name);
    this.__desc__ = desc;
  };

  this.prototype._splice = function(i, n, added) {
    var removed;
    added.forEach((o) => checkAssociatedType.call(this, o));
    removed = HasManyArray.__super__._splice.call(this, i, n, added);
    processSplice.call(this, i, n, added, removed.native);
    return removed;
  };

  this.prototype._inverseAdd = function(model) {
    this.__handlingInverse__ = true;
    this.push(model);
    this.__handlingInverse__ = false;
  };

  this.prototype._inverseRemove = function(model) {
    var i = this.indexOf(model);

    if (i >= 0) {
      this.__handlingInverse__ = true;
      this.splice(i, 1);
      this.__handlingInverse__ = false;
    }
  };
});

export default HasManyArray;
