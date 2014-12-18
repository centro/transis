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
});
