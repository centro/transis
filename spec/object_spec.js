import "es6-shim";
import BasisObject from "../object";

describe('Basis.Object', function() {
  var Test = BasisObject.extend('Test', function() {
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

  describe('.extend', function() {
    var Child = BasisObject.extend('Child', function() {
      this.prototype.init = function() {
      };
    });

    var Grandchild = Child.extend('Grandchild', function() {
      this.prototype.init = function() {
      };
    });

    it("sets the name argument as the subclass's displayName property", function() {
      expect(Child.displayName).toBe('Child');
      expect(Grandchild.displayName).toBe('Grandchild');
    });

    it('copies the static properties to the subclass', function() {
      expect(typeof Child.extend).toBe('function');
      expect(typeof Child.prop).toBe('function');
      expect(typeof Grandchild.extend).toBe('function');
      expect(typeof Grandchild.prop).toBe('function');
    });

    it("sets the subclass's prototype to an object that inherites from the parents prototype", function() {
      expect(BasisObject.prototype.isPrototypeOf(Child.prototype)).toBe(true);
      expect(Child.prototype.isPrototypeOf(Grandchild.prototype)).toBe(true);
    });

    it("sets the __super__ property on the subclass to the parent's prototype", function() {
      expect(Child.__super__).toBe(BasisObject.prototype);
      expect(Grandchild.__super__).toBe(Child.prototype);
    });

    it("sets the constructor property of the subclass's prototype to the subclass", function() {
      expect(Child.prototype.constructor).toBe(Child);
      expect(Grandchild.prototype.constructor).toBe(Grandchild);
    });

    it("allows the instanceof operator to work with instances of the subclass", function() {
      var child = new Child, grandchild = new Grandchild;

      expect(child instanceof Child).toBe(true);
      expect(grandchild instanceof Child).toBe(true);
      expect(grandchild instanceof Grandchild).toBe(true);
    });

    it("creates a constructor function that invokes the subclass's init method", function() {
      spyOn(Child.prototype, 'init');
      spyOn(Grandchild.prototype, 'init');

      new Child({foo: 1, bar: 2});
      expect(Child.prototype.init).toHaveBeenCalledWith({foo: 1, bar: 2});

      new Grandchild({baz: 3});
      expect(Grandchild.prototype.init).toHaveBeenCalledWith({baz: 3});
    });

    describe('with no name argument', function() {
      it('throws an exception', function() {
        expect(function() {
          BasisObject.extend();
        }).toThrow(new Error('Basis.Object.extend: a name is required'));
      });
    });
  });

  describe('.resolve', function() {
    it('returns the Basis.Object subclass of the given name', function() {
      var A = BasisObject.extend('A'), B = A.extend('B'), C = B.extend('C')

      expect(BasisObject.resolve('A')).toBe(A);
      expect(BasisObject.resolve('B')).toBe(B);
      expect(BasisObject.resolve('C')).toBe(C);
    });

    it('throws an error when a subclass with the given name is not known', function() {
      expect(function() {
        BasisObject.resolve('Abcdef');
      }).toThrow(new Error('Basis.Object.resolve: could not resolve subclass: `Abcdef`'));
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

      it('notifies observers of the prop', function() {
        var spy = jasmine.createSpy();

        t.on('str', spy);
        t.str = 'xyz';
        BasisObject.flush();
        expect(spy).toHaveBeenCalledWith('str');
      });

      it('notifies `*` observers', function() {
        var spy = jasmine.createSpy();

        t.on('*', spy);
        t.str = 'xyz';
        BasisObject.flush();
        expect(spy).toHaveBeenCalledWith('*');
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

    describe('with on option', function() {
      var User = BasisObject.extend('User', function() {
        this.prop('first');
        this.prop('last');
        this.prop('full', {
          readonly: true, on: ['first', 'last'],
          get: function() { return `${this.first} ${this.last}`; }
        });
        this.prop('greeting', {
          readonly: true, on: ['full'],
          get: function() { return `Hello ${this.full}`; }
        });
      });

      it('notifies observers of the prop when any of the dependent props change', function() {
        var u = new User({first: 'Joe', last: 'Blow'}), spy = jasmine.createSpy();

        u.on('full', spy);
        expect(u.full).toBe('Joe Blow');
        u.first = 'Bob';
        BasisObject.flush();
        expect(spy).toHaveBeenCalledWith('full');
        expect(spy.calls.count()).toBe(1);
        u.last = 'Smith';
        BasisObject.flush();
        expect(spy.calls.count()).toBe(2);
      });

      it('notifies observers of props that depend on computed props', function() {
        var u = new User({first: 'Joe', last: 'Blow'}), spy = jasmine.createSpy();

        u.on('greeting', spy);
        expect(u.greeting).toBe('Hello Joe Blow');
        u.last = 'Smith';
        BasisObject.flush();
        expect(spy).toHaveBeenCalledWith('greeting');
        expect(u.greeting).toBe('Hello Joe Smith');
      });

      it('notifies observers of a computed prop once when multiple dependencies change', function() {
        var u = new User({first: 'Joe', last: 'Blow'}), spy = jasmine.createSpy();

        u.on('full', spy);
        u.first = 'Bob';
        u.last = 'Smith';
        BasisObject.flush();
        expect(spy).toHaveBeenCalledWith('full');
        expect(spy.calls.count()).toBe(1);
      });

      it('notifies `*` observers once be flush cycle', function() {
        var u = new User({first: 'Joe', last: 'Blow'}), spy = jasmine.createSpy();

        u.on('*', spy);
        u.first = 'Bob';
        u.last = 'Smith';
        BasisObject.flush();
        expect(spy).toHaveBeenCalledWith('*');
        expect(spy.calls.count()).toBe(1);
      });
    });

    describe('with cache option', function() {
      var Foo, spy;

      beforeEach(function() {
        spy = jasmine.createSpy().and.callFake(function() { return this.a * 2; });
        Foo = BasisObject.extend('Foo', function() {
          this.prop('a');
          this.prop('doubleA', {cache: true, readonly: true, on: ['a'], get: spy});
        });
      });

      it('calls the getter function to initially compute the value', function() {
        var f = new Foo({a: 9});

        expect(f.doubleA).toBe(18);
        expect(spy.calls.count()).toBe(1);
      });

      it('returns the cached value on subsequent gets', function() {
        var f = new Foo({a: 7});

        expect(f.doubleA).toBe(14);
        expect(spy.calls.count()).toBe(1);
        expect(f.doubleA).toBe(14);
        expect(spy.calls.count()).toBe(1);
      });

      it('recomputes the value by calling the getter function after a dependent event is observed', function() {
        var f = new Foo({a: 3});

        expect(f.doubleA).toBe(6);
        expect(spy.calls.count()).toBe(1);
        expect(f.doubleA).toBe(6);
        expect(spy.calls.count()).toBe(1);
        f.a = 5;
        BasisObject.flush();
        expect(f.doubleA).toBe(10);
        expect(spy.calls.count()).toBe(2);
        expect(f.doubleA).toBe(10);
        expect(spy.calls.count()).toBe(2);
        f.a = 21;
        BasisObject.flush();
        expect(f.doubleA).toBe(42);
        expect(spy.calls.count()).toBe(3);
        expect(f.doubleA).toBe(42);
        expect(spy.calls.count()).toBe(3);
      });
    });
  });

  describe('.props', function() {
    var PropsTest = BasisObject.extend('PropsTest', function() {
      this.props({
        x: {},
        y: {
          readonly: true,
          get: function() {
            return this.x * 2;
          }
        }
      });
    });

    it('defines a prop for each key in the given object', function() {
      var t = new PropsTest({x: 4});

      expect(t.x).toBe(4);
      expect(t.y).toBe(8);
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
    it('returns a unique id for each instance of Basis.Object', function() {
      var o1 = new BasisObject, o2 = new BasisObject, o3 = new BasisObject;

      expect(typeof o1.objectId).toBe('number');
      expect(typeof o2.objectId).toBe('number');
      expect(typeof o3.objectId).toBe('number');
      expect(o1.objectId).not.toBe(o2.objectId);
      expect(o2.objectId).not.toBe(o3.objectId);
      expect(o1.objectId).not.toBe(o3.objectId);
    });
  });
});
