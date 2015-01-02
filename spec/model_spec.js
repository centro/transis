import "6to5/polyfill";
import Model from "../model";

describe('Model', function () {
  class BasicModel extends Model {}
  BasicModel.attr('str', 'string');
  BasicModel.attr('strWithDefault', 'string', {default: 'zzz'});
  BasicModel.attr('num', 'number');
  Model.registerClass(BasicModel);

  describe('.registerClass', function() {
    it('throws an exception when given something other than a Model subclass', function() {
      var x = {};

      expect(function() {
        Model.registerClass(x, 'x');
      }).toThrow(new Error(`Ryno.Model.registerClass: \`${x}\` is not a subclass of Ryno.Model`));
    });

    it('throws an exception when given a null name', function() {
      class A extends Model {}

      expect(function() {
        Model.registerClass(A, null);
      }).toThrow(new Error(`Ryno.Model.registerClass: no name given for class: \`${A}\``));
    });

    it('throws an exception when given a name that has already been registered', function() {
      class A1 extends Model {}
      class A2 extends Model {}

      Model.registerClass(A1, 'A');
      expect(function() {
        Model.registerClass(A2, 'A');
      }).toThrow(new Error("Ryno.Model.registerClass: a class with name `A` has already been registered"));
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
      }).toThrow(new Error(`BasicModel#id=: overwriting a model's identity is not allowed: ${m}`));
    });
  });

  describe('.attr', function() {
    beforeEach(function() {
      this.m = new BasicModel;
    });

    it('throws an exception if given an unregistered attr name', function() {
      expect(function() {
        BasicModel.attr('x', 'foo');
      }).toThrow(new Error('BasicModel.attr: unknown attribute type: `foo`'));
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

  describe('.hasOne', function() {
    describe('with no inverse', function() {
      class Bar extends Model {}
      class Foo extends Model {}
      Foo.hasOne('bar', Bar);

      it('creates a property with the given name', function() {
        expect('bar' in Foo.prototype).toBe(true);
      });

      it('initializes the property to undefined', function() {
        expect((new Foo).bar).toBeUndefined();
      });

      it('throws an exception when setting an object of the wrong type', function() {
        var f = new Foo, b = new BasicModel;
        expect(function() {
          f.bar = b;
        }).toThrow(new Error(`Foo#bar: expected an object of type \`Bar\` but received \`${b}\` instead`));
      });
    });

    describe('with a hasOne inverse', function() {
      class Bar extends Model {}
      class Foo extends Model {}
      Foo.hasOne('bar', Bar, {inverse: 'foo'});
      Bar.hasOne('foo', Foo, {inverse: 'bar'});

      it('sets the receiver as the inverse when setting', function() {
        var f = new Foo, b = new Bar;

        f.bar = b;
        expect(b.foo).toBe(f);
      });

      it('clears the inverse side when set to null', function() {
        var f = new Foo, b = new Bar;

        f.bar = b;
        expect(f.bar).toBe(b);
        expect(b.foo).toBe(f);
        f.bar = undefined;
        expect(f.bar).toBeUndefined();
        expect(b.foo).toBeUndefined();
      });
    });

    describe('with a hasMany inverse', function() {
      class Foo extends Model {}
      class Bar extends Model {}
      Foo.hasOne('bar', Bar, {inverse: 'foos'});
      Bar.hasMany('foos', Foo, {inverse: 'bar'});

      it('adds the receiver to the inverse array when setting', function() {
        var f1 = new Foo, f2 = new Foo, b = new Bar;

        f1.bar = b;
        expect(b.foos).toEqual([f1]);
        f2.bar = b;
        expect(b.foos).toEqual([f1, f2]);
      });

      it('removes the receiver from the inverse array when clearing', function() {
        var f1 = new Foo, f2 = new Foo, b = new Bar;

        f1.bar = b;
        f2.bar = b;
        expect(b.foos).toEqual([f1, f2]);
        f1.bar = null;
        expect(b.foos).toEqual([f2]);
        f2.bar = null;
        expect(b.foos).toEqual([]);
      });
    });
  });

  describe('.hasMany', function() {
    describe('with no inverse', function() {
      class Foo extends Model {}
      class Bar extends Model {}
      Foo.hasMany('bars', Bar);

      it('creates a property with the given name', function() {
        expect('bars' in Foo.prototype).toBe(true);
      });

      it('generates an "add<Name>" method', function() {
        expect(typeof Foo.prototype.addBars).toBe('function');
      });

      it('generates a "remove<Name>" method', function() {
        expect(typeof Foo.prototype.removeBars).toBe('function');
      });

      it('generates a "clear<Name>" method', function() {
        expect(typeof Foo.prototype.clearBars).toBe('function');
      });

      it('initializes the property to an empty array', function() {
        var f = new Foo;
        expect(f.bars).toEqual([]);
      });

      it('throws an exception when setting models of the wrong type', function() {
        var f = new Foo, b = new BasicModel;

        expect(function() {
          f.bars = [b];
        }).toThrow(new Error(`Foo#bars: expected an object of type \`Bar\` but received \`${b}\` instead`));
      });

      describe('generated add method', function() {
        it('adds the given model to the array', function() {
          var f = new Foo, b1 = new Bar, b2 = new Bar;

          f.addBars(b1, b2);
          expect(f.bars).toEqual([b1, b2]);
        });

        it('throws an exception when adding objects of the wrong type', function() {
          var f = new Foo, b = new BasicModel;

          expect(function() {
            f.addBars(b);
          }).toThrow(new Error(`Foo#bars: expected an object of type \`Bar\` but received \`${b}\` instead`));
        });
      });

      describe('generated remove method', function() {
        it('removes the given model from the array', function() {
          var f = new Foo, b1 = new Bar, b2 = new Bar;

          f.bars = [b1, b2];
          expect(f.bars).toEqual([b1, b2]);
          f.removeBars(b2);
          expect(f.bars).toEqual([b1]);
        });
      });

      describe('generated clear method', function() {
        it('removes all models from the array', function() {
          var f = new Foo, b1 = new Bar, b2 = new Bar;

          f.bars = [b1, b2];
          expect(f.bars).toEqual([b1, b2]);
          f.clearBars(b2);
          expect(f.bars).toEqual([]);
        });
      });
    });

    describe('with a hasOne inverse', function() {
      class Foo extends Model {}
      class Bar extends Model {}
      Foo.hasMany('bars', Bar, {inverse: 'foo'});
      Bar.hasOne('foo', Foo, {inverse: 'bars'});

      it('sets the hasOne side when adding to the hasMany side', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
        f.addBars(b1);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBeUndefined();
        f.addBars(b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
      });

      it('sets the hasOne side when setting the hasMany side', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
        f.bars = [b1, b2];
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
      });

      it('clears the hasOne side when removing from the hasMany side', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.addBars(b1, b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
        f.removeBars(b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBeUndefined();
      });

      it('clears the hasOne side when the hasMany side is cleared', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.addBars(b1, b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
        f.clearBars();
        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
      });

      it('clears the hasOne side when the hasMany side is set to an empty array', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.addBars(b1, b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
        f.bars = [];
        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
      });
    });

    describe('with a hasMany inverse', function() {
      class Foo extends Model {}
      class Bar extends Model {}
      Foo.hasMany('bars', Bar, {inverse: 'foos'});
      Bar.hasMany('foos', Foo, {inverse: 'bars'});

      it('adds the receiver on the inverse side when a model is added', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        expect(f.bars).toEqual([]);
        expect(b1.foos).toEqual([]);
        expect(b2.foos).toEqual([]);
        f.addBars(b1);
        expect(f.bars).toEqual([b1]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([]);
        f.addBars(b2);
        expect(f.bars).toEqual([b1, b2]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([f]);
      });

      it('adds the receiver on the inverse side when the association is set', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.bars = [b1, b2];
        expect(f.bars).toEqual([b1, b2]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([f]);
      });

      it('removes the receiver from the inverse side of the previously associated models when the association is set', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar, b3 = new Bar, b4 = new Bar;

        f.bars = [b1, b2];
        expect(f.bars).toEqual([b1, b2]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([f]);
        f.bars = [b3, b4];
        expect(f.bars).toEqual([b3, b4]);
        expect(b1.foos).toEqual([]);
        expect(b2.foos).toEqual([]);
      });

      it('removes the receiver from the inverse side when a model is removed', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.addBars(b1, b2);
        expect(f.bars).toEqual([b1, b2]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([f]);
        f.removeBars(b2);
        expect(f.bars).toEqual([b1]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([]);
        b1.removeFoos(f);
        expect(f.bars).toEqual([]);
        expect(b1.foos).toEqual([]);
        expect(b2.foos).toEqual([]);
      });
    });
  });
});
