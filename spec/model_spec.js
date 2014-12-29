import "es6-shim";
import Model from "../model";

describe('Model', function () {
  class BasicModel extends Model {
  }

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

  describe('#id=', function() {
    it('throws an exception when an attempt is made to overwrite an existing non-null value', function() {
      var m = new BasicModel({id: 1});
      expect(m.id).toBe(1);
      expect(function() {
        m.id = 9;
      }).toThrow(new Error(`Ryno.Model#id=: overwriting a model's identity is not allowed: ${m}`));
    });
  });
});
