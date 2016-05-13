import "es6-shim";
import TransisObject from "../object";

describe('Transis.Object', function() {
  var Test = TransisObject.extend(function() {
    this.prop('str');

    this.prop('num', {
      get: function() { return this._NUM_; },
      set: function(v) { this._NUM_ = v; }
    });

    this.prop('ro', {
      get: function() { return 4; }
    });

    this.prop('def', {
      default: 'hello'
    });

    this.prop('funcDef', {
      default: function() { return []; }
    });
  });

  describe('.extend', function() {
    var Child = TransisObject.extend(function() {
      this.prototype.init = function() {};
    });

    var Grandchild = Child.extend(function() {
      this.prototype.init = function() {};
    });

    it('copies the static properties to the subclass', function() {
      expect(typeof Child.extend).toBe('function');
      expect(typeof Child.prop).toBe('function');
      expect(typeof Grandchild.extend).toBe('function');
      expect(typeof Grandchild.prop).toBe('function');
    });

    it("sets the subclass's prototype to an object that inherites from the parents prototype", function() {
      expect(TransisObject.prototype.isPrototypeOf(Child.prototype)).toBe(true);
      expect(Child.prototype.isPrototypeOf(Grandchild.prototype)).toBe(true);
    });

    it("sets the __super__ property on the subclass to the parent's prototype", function() {
      expect(Child.__super__).toBe(TransisObject.prototype);
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

      describe('with a function as the default option', function() {
        it('returns the value of calling the function', function() {
          expect(t.funcDef).toEqual([]);
        });

        it('invokes the function once per instance', function() {
          var t2 = new Test;
          expect(t.funcDef).toBe(t.funcDef);
          expect(t2.funcDef).toBe(t2.funcDef);
          expect(t2.funcDef).not.toBe(t.funcDef);
        });

        it('returns the set value', function() {
          expect(t.funcDef).toEqual([]);
          t.funcDef = ['foo'];
          expect(t.funcDef).toEqual(['foo']);
        });
      });

      describe('with pure set to false', function() {
        var spy = jasmine.createSpy();
        var Foo = TransisObject.extend(function() {
          this.prop('impure', {
            pure: false,
            get: spy
          });
        });

        it('invokes the getter in the context of the receiver', function() {
          var f = new Foo;
          f.impure;
          expect(spy.calls.mostRecent().object).toBe(f);
        });
      });

      describe('with pure set to true', function() {
        var calls;

        var spy = function(a) {
          calls.push({_this: this, args: [].slice.call(arguments)});
          return a * 2;
        };

        var Foo = TransisObject.extend(function() {
          this.prop('a');
          this.prop('twiceA', {pure: true, on: ['a'], get: spy});
        });

        beforeEach(function() { calls = []; });

        it('invokes the getter in the null context', function() {
          var f = new Foo({a: 3});
          expect(f.twiceA).toBe(6);
          expect(calls[0]._this).toBe(null);
        });

        it('invokes the getter with the dependencies as arguments', function() {
          var f = new Foo({a: 4});
          expect(f.twiceA).toBe(8);
          expect(calls[0].args).toEqual([4]);
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
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('str');
      });

      it('notifies `*` observers', function() {
        var spy = jasmine.createSpy();

        t.on('*', spy);
        t.str = 'xyz';
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('*');
      });

      describe('with the readonly option', function() {
        it('generates a readonly property', function() {
          expect(t.ro).toBe(4);
          expect(t.ro).toBe(4);
        });
      });
    });

    describe('with on option', function() {
      var User = TransisObject.extend(function() {
        this.prop('first');
        this.prop('last');
        this.prop('full', {
          on: ['first', 'last'],
          get: function(first, last) { return `${first} ${last}`; }
        });
        this.prop('greeting', {
          on: ['full'],
          get: function(full) { return `Hello ${full}`; }
        });
      });

      it('notifies observers of the prop when any of the dependent props change', function() {
        var u = new User({first: 'Joe', last: 'Blow'}), spy = jasmine.createSpy();

        u.on('full', spy);
        expect(u.full).toBe('Joe Blow');
        u.first = 'Bob';
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('full');
        expect(spy.calls.count()).toBe(1);
        u.last = 'Smith';
        TransisObject.flush();
        expect(spy.calls.count()).toBe(2);
      });

      it('notifies observers of props that depend on computed props', function() {
        var u = new User({first: 'Joe', last: 'Blow'}), spy = jasmine.createSpy();

        u.on('greeting', spy);
        expect(u.greeting).toBe('Hello Joe Blow');
        u.last = 'Smith';
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('greeting');
        expect(u.greeting).toBe('Hello Joe Smith');
      });

      it('notifies observers of a computed prop once when multiple dependencies change', function() {
        var u = new User({first: 'Joe', last: 'Blow'}), spy = jasmine.createSpy();

        u.on('full', spy);
        u.first = 'Bob';
        u.last = 'Smith';
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('full');
        expect(spy.calls.count()).toBe(1);
      });

      it('notifies `*` observers once per flush cycle', function() {
        var u = new User({first: 'Joe', last: 'Blow'}), spy = jasmine.createSpy();

        u.on('*', spy);
        u.first = 'Bob';
        u.last = 'Smith';
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('*');
        expect(spy.calls.count()).toBe(1);
      });

      describe('with a prop name that contains a period', function() {
        var Foo = TransisObject.extend(function() {
          this.prop('x', {on: ['foo.bar'], get: function() { return 9; }});
        });

        it('notifies observers when either the full prop name changes or the first segment changes', function() {
          var f = new Foo, spy = jasmine.createSpy();

          f.on('x', spy);

          f.didChange('foo.bar');
          TransisObject.flush();
          expect(spy.calls.count()).toBe(1);

          f.didChange('foo');
          TransisObject.flush();
          expect(spy.calls.count()).toBe(2);
        });

        it('throws an exception when the prop name has more than one period', function() {
          expect(function() {
            TransisObject.extend(function() {
              this.prop('x', {on: ['foo.bar.baz'], get: function() {}});
            });
          }).toThrow(new Error('Transis.Object.defineProp: dependent property paths of more than two segments are not allowed: `foo.bar.baz`'));
        });
      });
    });

    describe('with cache option', function() {
      var Foo, spy;

      beforeEach(function() {
        spy = jasmine.createSpy().and.callFake(function(a) { return a * 2; });
        Foo = TransisObject.extend(function() {
          this.prop('a');
          this.prop('doubleA', {cache: true, on: ['a'], get: spy});
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
        TransisObject.flush();
        expect(f.doubleA).toBe(10);
        expect(spy.calls.count()).toBe(2);
        expect(f.doubleA).toBe(10);
        expect(spy.calls.count()).toBe(2);
        f.a = 21;
        TransisObject.flush();
        expect(f.doubleA).toBe(42);
        expect(spy.calls.count()).toBe(3);
        expect(f.doubleA).toBe(42);
        expect(spy.calls.count()).toBe(3);
      });
    });
  });

  describe('.props', function() {
    var PropsTest = TransisObject.extend(function() {
      this.props({
        x: {},
        y: {
          pure: false,
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

  describe('.delay', function() {
    beforeEach(function() {
      this.spy = jasmine.createSpy();
      TransisObject.delay(this.spy);
    });

    it('invokes the given function after the next flush', function() {
      expect(this.spy).not.toHaveBeenCalled();
      TransisObject.flush();
      expect(this.spy).toHaveBeenCalled();
    });

    it('does not invoke the given function on subsequent flushes', function() {
      expect(this.spy.calls.count()).toBe(0);
      TransisObject.flush();
      expect(this.spy.calls.count()).toBe(1);
      TransisObject.flush();
      expect(this.spy.calls.count()).toBe(1);
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

    it('does not set readonly props', function() {
      expect(function() {
        new Test({ro: 1});
      }).not.toThrow();
    });
  });

  describe('#objectId', function() {
    it('returns a unique id for each instance of Transis.Object', function() {
      var o1 = new TransisObject, o2 = new TransisObject, o3 = new TransisObject;

      expect(typeof o1.objectId).toBe('number');
      expect(typeof o2.objectId).toBe('number');
      expect(typeof o3.objectId).toBe('number');
      expect(o1.objectId).not.toBe(o2.objectId);
      expect(o2.objectId).not.toBe(o3.objectId);
      expect(o1.objectId).not.toBe(o3.objectId);
    });
  });

  describe('#prop', function() {
    beforeEach(function() {
      this.t = new Test;
      this.t.prop('x');
    });

    it("generates an enumerable property with the given name on the receiver and not the receiver's prototype", function() {
      expect('x' in this.t).toBe(true);
      expect('x' in new Test).toBe(false);
    });

    it('notifies observers when changed', function() {
      var spy = jasmine.createSpy();

      this.t.on('x', spy);
      this.t.x = 9;
      TransisObject.flush();
      expect(spy).toHaveBeenCalledWith('x');
    });

    it('notifies `*` observers', function() {
      var spy = jasmine.createSpy();

      this.t.on('*', spy);
      this.t.x = 9;
      TransisObject.flush();
      expect(spy).toHaveBeenCalledWith('*');
    });
  });

  describe('#props', function() {
    beforeEach(function() {
      this.t = new Test;
      this.t.props({
        x: {},
        y: {get: function() { return 9; }}
      });
    });

    it("defines a prop for each key in the given object directly on the receiver", function() {
      expect('x' in this.t).toBe(true);
      expect('y' in this.t).toBe(true);
      expect('x' in new Test).toBe(false);
      expect('y' in new Test).toBe(false);
      expect(this.t.y).toBe(9);
    });
  });

  describe("'*' observers", function() {
    it('gets fired when a local property changes', function() {
      var o = new TransisObject, spy = jasmine.createSpy();
      o.on('*', spy);
      o.didChange('foo');
      TransisObject.flush();
      expect(spy).toHaveBeenCalledWith('*');
    });

    it('does not get fired when only a remote property changes', function() {
      var o = new TransisObject, spy = jasmine.createSpy();
      o.on('*', spy);
      o.didChange('foo.bar');
      TransisObject.flush();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('observer notification', function() {
    it('does not throw an error when one observer of a property removes another', function() {
      var o = new TransisObject, spy = jasmine.createSpy(), cb;

      cb = function() { o.off('*', spy); };

      o.on('*', cb);
      o.on('*', spy);

      o.didChange('x');

      expect(function() {
        TransisObject.flush();
      }).not.toThrow();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('#toString', function() {
    it('returns a string containing the constructor name and object id', function() {
      var X = TransisObject.extend(), x = new X, o = new TransisObject;
      X.displayName = 'X';

      expect(o.toString()).toBe(`#<Transis.Object:${o.objectId}>`);
      expect(x.toString()).toBe(`#<X:${x.objectId}>`);
    });
  });

  describe('#getPath', function() {
    var Foo = TransisObject.extend(function() {
      this.prop('bar');
    });

    var Bar = TransisObject.extend(function() {
      this.prop('baz');
    });

    it('returns the value at the given path', function() {
      var f = new Foo({bar: new Bar({baz: 3})});
      expect(f.getPath('bar.baz')).toBe(3);
      expect(f.getPath('bar.quux')).toBeUndefined();
    });
  });

  describe('.flush', function() {
    it('handles exceptions in the observer callback', function() {
      var t1 = new Test({str: 'a'}),
          t2 = new Test({str: 'b'}),
          spy1 = jasmine.createSpy().and.throwError(),
          spy2 = jasmine.createSpy();

      t1.on('str', spy1);
      t2.on('str', spy2);

      t1.str = 'aa';
      t2.str = 'bb';

      TransisObject.flush();

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe('#notify', function() {
    beforeEach(function() {
      this.object = new TransisObject;
      this.spy = jasmine.createSpy();
      this.object.on('foo', this.spy);
    });

    it('invokes observers registered with the on method', function() {
      this.object.notify('foo');
      expect(this.spy).toHaveBeenCalled();
    });

    it('passes the event name to the observer', function() {
      this.object.notify('foo');
      expect(this.spy).toHaveBeenCalledWith('foo');
    });

    it('passes any additional arguments on to the observer', function() {
      this.object.notify('foo', 1, 2, 3);
      expect(this.spy).toHaveBeenCalledWith('foo', 1, 2, 3);
    });

    it('does not invoke observers removed with the off method', function() {
      this.object.off('foo', this.spy);
      this.object.notify('foo', 1, 2, 3);
      expect(this.spy).not.toHaveBeenCalled();
    });

    it('swallows exceptions thrown by the observer', function() {
      var spy = jasmine.createSpy().and.throwError();
      this.object.on('baz', spy);
      expect(function() {
        this.object.notify('baz');
      }.bind(this)).not.toThrow();
    });
  });
});
