import IdMap from "./id_map";
import * as attrs from "./attrs";

var registeredClasses = {}, registeredAttrs = {};

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
  static registerClass(klass, name = klass.name) {
    if (typeof klass !== 'function' || !(klass.prototype instanceof Model)) {
      throw new Error(`Ryno.Model.registerClass: \`${klass}\` is not a subclass of Ryno.Model`);
    }

    if (typeof name !== 'string' || name.length === 0) {
      throw new Error(`Ryno.Model.registerClass: no name given for class: \`${klass}\``);
    }

    if (name in registeredClasses) {
      throw new Error(`Ryno.Model.registerClass: a class with name \`${name}\` has already been registered`);
    }

    registeredClasses[name] = klass;

    return this;
  }

  // Public: Returns an empty instance of the model class. An empty instance contains only an id
  // and must be retrieved from the mapper before any of its attributes will be available. Since the
  // model's data mapper will likely need to perform an async action to retrieve data, this method
  // is used to construct an object that is suitable for returning from `Model.get` immediately.
  // Once the data mapper has finished loading the actual model data, the empty model will have its
  // attributes filled in.
  //
  // id - The id of the model.
  //
  // Returns a new instance of the class.
  static empty(id) {
    var model = new this({id: id});
    model.__sourceState__ = EMPTY;
    return model;
  }

  // Public: Registers a new attribute type available to be used on `Model` subclasses.
  //
  // name      - A string representing the name of the attribute type.
  // converter - A converter object or constructor function. Converter objects must implement two
  //             methods: `coerce` and `serialize`. The `coerce` method should take the given value
  //             and do its best to convert it to attribute's actual type. The `serialize` method
  //             should take the coerced value and return something suitable for JSON serialization.
  //             If a constructor function is given here, it will be instantiated once for each
  //             declared attribute of this type and will be passed the options object given to the
  //             `.attr` method.
  //
  // Returns the receiver.
  static registerAttr(name, converter) {
    if (registeredAttrs[name]) {
      throw new Error(`Ryno.Model.registerAttr: an attribute with the name \`${name}\` has already been defined`);
    }

    registeredAttrs[name] = converter;

    return this;
  }

  // Public: Defines an attribute on the model class. Attributes are typed properties that can
  // parse/coerce raw values (say from a JSON object) into objects of the property type. Calling
  // this method will define a property on the class's `prototype` so that it is available to all
  // instances.
  //
  // Attribute values are automatically coerced to their proper type when set. The original value is
  // available in the property named "<name>BeforeCoercion".
  //
  // name - A string representing the name of the attribute.
  // type - A string representing the type of the attribute (this must have been previously
  //        registered with `Model.registerAttr`).
  // opts - An object containing properties to pass to the attribute's converter object (default:
  //        `{}`).
  //   default - Used as the value of the attribute when undefined.
  //
  // Returns the receiver.
  static attr(name, type, opts) {
    var converter = registeredAttrs[type], key = `__${name}__`, def = undefined;

    if (!converter) {
      throw new Error(`Ryno.Model.attr: unknown attribute type: \`${type}\``);
    }

    if (typeof converter === 'function') { converter = new converter(opts); }
    if (opts && ('default' in opts)) { def = opts.default; }

    Object.defineProperty(this.prototype, name, {
      get: function() {
        return this[key] === undefined ? def : this[key];
      },
      set: function(v) {
        this[key] = converter.coerce(v);
        this[`${name}BeforeCoercion`] = v;
      }
    });

    return this;
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

Model.registerAttr('identity', attrs.IdentityAttr);
Model.registerAttr('string', attrs.StringAttr);
Model.registerAttr('number', attrs.NumberAttr);
Model.registerAttr('boolean', attrs.BooleanAttr);
Model.registerAttr('date', attrs.DateAttr);
Model.registerAttr('datetime', attrs.DateTimeAttr);

export default Model;
