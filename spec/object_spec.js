import "es6-shim";
import RynoObject from "../object";

describe('Ryno.Object', function() {
  var Test = RynoObject.extend('Test', function() {
    this.prop('str');

    this.prop('num', {
      get: function() { return this._NUM_; },
      set: function(v) { this._NUM_ = v; }
    });

    this.prop('ro', {
      readonly: true,
      get: function() { return 4; }
    });

    this.prop('def', {
      default: 'hello'
    });
  });

  describe('.resolve', function() {
    it('returns the Ryno.Object subclass of the given name', function() {
      var A = RynoObject.extend('A'), B = A.extend('B'), C = B.extend('C')

      expect(RynoObject.resolve('A')).toBe(A);
      expect(RynoObject.resolve('B')).toBe(B);
      expect(RynoObject.resolve('C')).toBe(C);
    });

    it('throws an error when a subclass with the given name is not known', function() {
      expect(function() {
        RynoObject.resolve('Abcdef');
      }).toThrow(new Error('Ryno.Object.resolve: could not resolve subclass: `Abcdef`'));
    });
  });

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

      describe('with the default option', function() {
        it('returns the value of the default option when the property has not yet been set', function() {
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

    describe('with changesOn option', function() {
      var User = RynoObject.extend('User', function() {
        this.prop('first');
        this.prop('last');
        this.prop('full', {
          readonly: true, changesOn: ['change:first', 'change:last'],
          get: function() { return `${this.first} ${this.last}`; }
        });
      });

      it('causes `change:<name>` events to be emitted whenever any of the events are observed', function() {
        var u = new User({first: 'Joe', last: 'Blow'}), spy = jasmine.createSpy();

        u.on('change:full', spy);
        expect(u.full).toBe('Joe Blow');
        u.first = 'Bob';
        expect(spy).toHaveBeenCalledWith('change:full', {object: u});
        expect(spy.calls.count()).toBe(1);
        u.last = 'Smith';
        expect(spy.calls.count()).toBe(2);
      });
    });
  });

  describe('constructor', function() {
    it('sets the given props on the new instance', function() {
      var t = new Test({str: 'abc', num: 9});

      expect(t.str).toBe('abc');
      expect(t.num).toBe(9);
    });

    it('does not set keys that are not defined props', function() {
      var t = new Test({str: 'abc', num: 9, blah: 'baz'});

      expect('blah' in t).toBe(false);
      expect(t.blah).toBeUndefined();
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
