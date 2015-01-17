import "es6-shim";
import RynoObject from "../object";

class Test extends RynoObject {}

Test.prop('str');

Test.prop('num', {
  get: function() { return this._NUM_; },
  set: function(v) { this._NUM_ = v; }
});

Test.prop('ro', {
  readonly: true,
  get: function() { return 4; }
});

Test.prop('def', {
  def: 'hello'
});

describe('Ryno.Object', function() {
  describe('.prop', function() {
    var t;

    beforeEach(function() { t = new Test; });

    it('generates an enumerable property with the given name', function() {
      expect('str' in t).toBe(true);
    });

    it('generates a getter/setter property with the given name', function() {
      t.str = 'foo';
      expect(t.str).toBe('foo');
    });

    describe('getter', function() {
      it('defaults values to undefined', function() {
        expect(t.str).toBeUndefined();
      });

      it('returns the value of the private property based on the given name', function() {
        t.__str = 'foobar';
        expect(t.str).toBe('foobar');
      });

      it('invokes the custom getter function when defined', function() {
        t._NUM_ = 12;
        expect(t.num).toBe(12);
      });

      describe('with the def option', function() {
        it('returns the value of the def option when the property has not yet been set', function() {
          expect(t.def).toBe('hello');
        });

        it('returns the set value', function() {
          expect(t.def).toBe('hello');
          t.def = 'goodbye';
          expect(t.def).toBe('goodbye');
        });
      });
    });

    describe('setter', function() {
      it('sets the value to a private property based on the given name', function() {
        t.str = 'abc123';
        expect(t.__str).toBe('abc123');
      });

      it('invokes the custom setter when defined', function() {
        expect(t._NUM_).toBeUndefined();
        expect(t.__num__).toBeUndefined();
        t.num = 21;
        expect(t._NUM_).toBe(21);
        expect(t.__num__).toBeUndefined();
      });

      it('emits a change event namespaced to the prop name', function() {
        var spy = jasmine.createSpy();

        t.on('change:str', spy);
        t.str = 'xyz';
        expect(spy).toHaveBeenCalled();
      });

      it('emits an event with the previous value of the property', function() {
        var spy = jasmine.createSpy();

        t.str = 'abc';
        t.on('change:str', spy);
        t.str = 'xyz';
        expect(spy).toHaveBeenCalledWith('change:str', {object: t, old: 'abc'});
      });

      describe('with the readonly option', function() {
        it('generates a readonly property', function() {
          expect(t.ro).toBe(4);
          expect(function() { t.ro = 5; }).toThrow();
          expect(t.ro).toBe(4);
        });
      });

      describe('with the readonly option', function() {
        it('throws an exception', function() {
          expect(function() { t.ro = 9;; }).toThrow();
        });
      });
    });
  });

  describe('#objectId', function() {
    it('returns a unique id for each instance of Ryno.Object', function() {
      var o1 = new RynoObject, o2 = new RynoObject, o3 = new RynoObject;

      expect(typeof o1.objectId).toBe('number');
      expect(typeof o2.objectId).toBe('number');
      expect(typeof o3.objectId).toBe('number');
      expect(o1.objectId).not.toBe(o2.objectId);
      expect(o2.objectId).not.toBe(o3.objectId);
      expect(o1.objectId).not.toBe(o3.objectId);
    });
  });
});
