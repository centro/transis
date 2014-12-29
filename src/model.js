import IdMap from "./id_map";

var classes = {};

const NEW      = 'new';
const EMPTY    = 'empty';
const LOADED   = 'loaded';
const DELETED  = 'deleted';
const NOTFOUND = 'notfound';

class Model {
  // Public: Registers the given `Model` subclass using the given name. Model subclasses must be
  // registered when they are referenced as a string in either a `hasOne` or `hasMany` association.
  //
  // klass - A subclass of `Model`.
  // name  - A string. This string can be used to reference the model class in associations.
  //
  // Returns the receiver.
  static registerModel(klass, name = klass.name) {
    if (typeof klass !== 'function' || !(klass.prototype instanceof Model)) {
      throw new Error(`Ryno.Model.registerModel: \`${klass}\` is not a subclass of Ryno.Model`);
    }

    if (typeof name !== 'string' || name.length === 0) {
      throw new Error(`Ryno.Model.registerModel: no name given for class: \`${klass}\``);
    }

    if (name in classes) {
      throw new Error(`Ryno.Model.registerModel: a class with name \`${name}\` has already been registered`);
    }

    classes[name] = klass;

    return this;
  }

  static empty(id) {
    var model = new this({id: id});
    model.__sourceState__ = EMPTY;
    return model;
  }

  constructor(attrs) {
    for (let k in attrs) {
      if (k in this) { this[k] = attrs[k]; }
    }
  }

  get id() { return this.__id__; }
  set id(id) {
    if (this.__id__) {
      throw new Error(`Ryno.Model#id=: overwriting a model's identity is not allowed: ${this}`);
    }

    this.__id__ = id;

    IdMap.insert(this);
  }

  get sourceState() { return this.__sourceState__; }

  toString() {
    return `#<${this.constructor.name}:${this.id}>`;
  }
}

Model.NEW      = NEW;
Model.EMPTY    = EMPTY;
Model.LOADED   = LOADED;
Model.DELETED  = DELETED;
Model.NOTFOUND = NOTFOUND;

export default Model;

