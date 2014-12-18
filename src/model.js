var classes = {};

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
}

export default Model;

