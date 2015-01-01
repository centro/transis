import "es6-shim";
import Model from "../model";

describe('Model', function () {
  class BasicModel extends Model {}
  BasicModel.attr('str', 'string');
  BasicModel.attr('strWithDefault', 'string', {default: 'zzz'});
  BasicModel.attr('num', 'number');
  Model.registerModel(BasicModel);

  describe('.registerModel', function() {
    it('throws an exception when given something other than a Model subclass', function() {
      var x = {};

      expect(function() {
        Model.registerModel(x, 'x');
      }).toThrow(new Error(`Ryno.Model.registerModel: \`${x}\` is not a subclass of Ryno.Model`));
    });

    it('throws an exception when given a null name', function() {
      class A extends Model {}

      expect(function() {
        Model.registerModel(A, null);
      }).toThrow(new Error(`Ryno.Model.registerModel: no name given for class: \`${A}\``));
    });

    it('throws an exception when given a name that has already been registered', function() {
      class A1 extends Model {}
      class A2 extends Model {}

      Model.registerModel(A1, 'A');
      expect(function() {
        Model.registerModel(A2, 'A');
      }).toThrow(new Error("Ryno.Model.registerModel: a class with name `A` has already been registered"));
    });
  });

  describe('.empty', function() {
    it('returns an instance of the class with sourceState set to EMPTY and the given id', function() {
      var m = Model.empty(127);
      expect(m.id).toBe(127);
      expect(m.sourceState).toBe(Model.EMPTY);
    });
  });

  describe('.registerAttr', function() {
    it('throws an exception when an attribute with the given name has already been defined', function() {
      expect(function() {
        Model.registerAttr('string');
      }).toThrow(new Error('Ryno.Model.registerAttr: an attribute with the name `string` has already been defined'));
    });
  });

  describe('#id=', function() {
    it('throws an exception when an attempt is made to overwrite an existing non-null value', function() {
      var m = new BasicModel({id: 1});
      expect(m.id).toBe(1);
      expect(function() {
        m.id = 9;
      }).toThrow(new Error(`Ryno.Model#id=: overwriting a model's identity is not allowed: ${m}`));
    });
  });

  describe('.attr', function() {
    beforeEach(function() {
      this.m = new BasicModel;
    });

    it('throws an exception if given an unregistered attr name', function() {
      expect(function() {
        BasicModel.attr('x', 'foo');
      }).toThrow(new Error('Ryno.Model.attr: unknown attribute type: `foo`'));
    });

    it('defines a property on the class prototype with the given name', function() {
      expect('str' in BasicModel.prototype).toBe(true);
    });

    it('defines a property that sets a private property based on the given name', function() {
      expect(this.m.__str__).toBeUndefined();
      this.m.str = 'abc';
      expect(this.m.__str__).toBe('abc');
    });

    it('defines a property that gets a private property based on the given name', function() {
      this.m.__str__ = 'xyz';
      expect(this.m.str).toBe('xyz');
    });

    it('uses the `default` option as the default value when one has yet to be set', function() {
      expect(this.m.strWithDefault).toBe('zzz');
      this.m.strWithDefault = 'a';
      expect(this.m.strWithDefault).toBe('a');
      this.m.strWithDefault = undefined;
      expect(this.m.strWithDefault).toBe('zzz');
    });

    it("returns undefined as the default value when one isn't specified", function() {
      expect(this.m.str).toBeUndefined();
    });

    it("coerces the given value when setting via the attr's coerce method", function() {
      this.m.num = '9';
      expect(this.m.num).toBe(9);
    });

    it('sets the <name>BeforeCoercion property to the given value when setting', function() {
      this.m.num = '9';
      expect(this.m.num).toBe(9);
      expect(this.m.numBeforeCoercion).toBe('9');
    });
  });
});
