import "es6-shim";
import RynoArray from "../array";
import RynoObject from "../object";

var A = RynoArray.A;

describe('Array', function() {
  describe('.A', function() {
    it('returns a Ryno.Array containing all of the given arguments', function() {
      var a1 = A(1,2,3), a2 = A(9);

      expect(a1 instanceof RynoArray).toBe(true);
      expect(a1.length).toBe(3);
      expect(a1.at(0)).toBe(1);
      expect(a1.at(1)).toBe(2);
      expect(a1.at(2)).toBe(3);
      expect(a2 instanceof RynoArray).toBe(true);
      expect(a2.length).toBe(1);
      expect(a2.at(0)).toBe(9);
    });

    it('returns an empty Ryno.Array when given no arguments', function() {
      var a = A();

      expect(a instanceof RynoArray).toBe(true);
      expect(a.length).toBe(0);
    });
  });

  describe('.from', function() {
    it('creates a new Ryno.Array with the contents of the given native array', function() {
      var a = [1, 2];

      expect(RynoArray.from(a) instanceof RynoArray).toBe(true);
      expect(RynoArray.from(a)).toEqual(a);
    });

    it('creates a new RynoArray with the contents of the given Arguments object', function() {
      var args = (function() { return arguments; })('a', 'b', 'c');

      expect(RynoArray.from(args) instanceof RynoArray).toBe(true);
      expect(RynoArray.from(args)).toEqual(A('a', 'b', 'c'));
    });

    it('creates a new Ryno.Array with the contents of the given Ryno.Array', function() {
      var a = A(1, 2);

      expect(RynoArray.from(a) instanceof RynoArray).toBe(true);
      expect(RynoArray.from(a)).not.toBe(a);
      expect(RynoArray.from(a)).toEqual(a);
    });
  });

  describe('constructor', function() {
    it('creates an array of the given size when passed a single number', function() {
      var a = new RynoArray(3);

      expect(a.length).toBe(3);
      expect(a.at(0)).toBeUndefined();
      expect(a.at(1)).toBeUndefined();
      expect(a.at(2)).toBeUndefined();
    });

    it('creates an array whose contents are the given arguments', function() {
      var a1 = new RynoArray(1, 2), a2 = new RynoArray('a', 'b', 'c');

      expect(a1.length).toBe(2);
      expect(a1.at(0)).toBe(1);
      expect(a1.at(1)).toBe(2);
      expect(a2.length).toBe(3);
      expect(a2.at(0)).toBe('a');
      expect(a2.at(1)).toBe('b');
      expect(a2.at(2)).toBe('c');
    });

    it('creates an empty array when no arguments are given', function() {
      var a = new RynoArray;

      expect(a.length).toBe(0);
    });
  });

  describe('#at', function() {
    var a;

    beforeEach(function() { a = new RynoArray('the', 'quick', 'brown', 'fox'); });

    describe('given just an index', function() {
      it('returns the value at the given index when given a positive index in range', function() {
        expect(a.at(0)).toBe('the');
        expect(a.at(1)).toBe('quick');
        expect(a.at(2)).toBe('brown');
        expect(a.at(3)).toBe('fox');
      });

      it('returns the value at the index starting from the end when given a negative index in range', function() {
        expect(a.at(-1)).toBe('fox');
        expect(a.at(-2)).toBe('brown');
        expect(a.at(-3)).toBe('quick');
        expect(a.at(-4)).toBe('the');
      });

      it('returns undefined when given a positive index that is out of range', function() {
        expect(a.at(4)).toBeUndefined();
        expect(a.at(112)).toBeUndefined();
      });

      it('returns undefined when given a negative index that is out of range', function() {
        expect(a.at(-5)).toBeUndefined();
        expect(a.at(-1743)).toBeUndefined();
      });
    });

    describe('given an index and a value', function() {
      it('sets the value at the given index', function() {
        expect(a.at(0)).toBe('the');
        a.at(0, 'THE');
        expect(a.at(0)).toBe('THE');
        expect(a.at(-1)).toBe('fox');
        a.at(-1, 'dog');
        expect(a.at(-1)).toBe('dog');
        a.at(2, 'two');
        expect(a.at(2)).toBe('two');
        a.at(2, undefined);
        expect(a.at(2)).toBeUndefined();
      });

      it('returns the value', function() {
        expect(a.at(1, 'slow')).toBe('slow');
      });
    });
  });

  describe('#splice', function() {
    var a;

    describe('with 1 argument', function() {
      it('removes all remaining items starting at the given index', function() {
        a = A(0, 1, 2);
        a.splice(0);
        expect(a).toEqual(A());

        a = A(0, 1, 2);
        a.splice(1);
        expect(a).toEqual(A(0));

        a = A(0, 1, 2);
        a.splice(2);
        expect(a).toEqual(A(0, 1));

        a = A(0, 1, 2);
        a.splice(3);
        expect(a).toEqual(A(0, 1, 2));
      });
    });

    describe('with a positive index in range', function() {
      it('replaces the given number of items starting at the given index with the given objects', function() {
        a = A(0, 1, 2);
        a.splice(0, 0);
        expect(a).toEqual(A(0, 1, 2));

        a = A(0, 1, 2);
        a.splice(0, 1);
        expect(a).toEqual(A(1, 2));

        a = A(0, 1, 2);
        a.splice(1, 1);
        expect(a).toEqual(A(0, 2));

        a = A(0, 1, 2);
        a.splice(1, 2);
        expect(a).toEqual(A(0));

        a = A(0, 1, 2);
        a.splice(1, 20);
        expect(a).toEqual(A(0));

        a = A(0, 1, 2);
        a.splice(0, 1, 100);
        expect(a).toEqual(A(100, 1, 2));

        a = A(0, 1, 2);
        a.splice(1, 2, 'a', 'b');
        expect(a).toEqual(A(0, 'a', 'b'));

        a = A(0, 1, 2);
        a.splice(1, 2, 'a', 'b', 'c', 'd');
        expect(a).toEqual(A(0, 'a', 'b', 'c', 'd'));
      });
    });

    describe('with a positive index out of range', function() {
      it('appends the added values to the end of the array', function() {
        a = A(0, 1, 2);
        a.splice(4, 0, 'x');
        expect(a).toEqual(A(0, 1, 2, 'x'));

        a = A(0, 1, 2);
        a.splice(4, 0, 'x', 'y', 'z');
        expect(a).toEqual(A(0, 1, 2, 'x', 'y', 'z'));

        a = A(0, 1, 2);
        a.splice(4, 2, 'x', 'y', 'z');
        expect(a).toEqual(A(0, 1, 2, 'x', 'y', 'z'));
      });
    });

    describe('with a negative index in range', function() {
      it('replaces the given number of items starting at the index from the right with the given objects', function() {
        a = A(0, 1, 2);
        a.splice(-3, 0);
        expect(a).toEqual(A(0, 1, 2));

        a = A(0, 1, 2);
        a.splice(-3, 1);
        expect(a).toEqual(A(1, 2));

        a = A(0, 1, 2);
        a.splice(-2, 1);
        expect(a).toEqual(A(0, 2));

        a = A(0, 1, 2);
        a.splice(-2, 2);
        expect(a).toEqual(A(0));

        a = A(0, 1, 2);
        a.splice(-2, 20);
        expect(a).toEqual(A(0));

        a = A(0, 1, 2);
        a.splice(-3, 1, 100);
        expect(a).toEqual(A(100, 1, 2));

        a = A(0, 1, 2);
        a.splice(-2, 2, 'a', 'b');
        expect(a).toEqual(A(0, 'a', 'b'));

        a = A(0, 1, 2);
        a.splice(-2, 2, 'a', 'b', 'c', 'd');
        expect(a).toEqual(A(0, 'a', 'b', 'c', 'd'));
      });
    });

    describe('with a negative index out of range', function() {
      it('throws an exception', function() {
        var a = A(0, 1, 2);

        expect(function() {
          a.splice(-12);
        }).toThrow(new Error('Ryno.Array#splice: index -12 is too small for ' + a));
      });
    });

    it('returns an array containing the items removed', function() {
      expect(A(0, 1, 2).splice(0)).toEqual(A(0, 1, 2));
      expect(A(0, 1, 2).splice(1)).toEqual(A(1, 2));
      expect(A(0, 1, 2).splice(2)).toEqual(A(2));
      expect(A(0, 1, 2).splice(3)).toEqual(A());
      expect(A(0, 1, 2).splice(1, 1, 10)).toEqual(A(1));
      expect(A(0, 1, 2).splice(0, 3, 10)).toEqual(A(0, 1, 2));
      expect(A(0, 1, 2).splice(10, 3, 10)).toEqual(A());
    });

    it('returns an instance of Ryno.Array', function() {
      expect(A(0, 1, 2).splice(0) instanceof RynoArray).toBe(true);
    });

    it('emits a splice event with the array, index, num removed, added, and removed elements', function() {
      var a = A('a', 'b', 'c', 'd', 'e'), spy = jasmine.createSpy();

      a.on('splice', spy);
      a.splice(2, 2, 'C', 'D');
      expect(spy).toHaveBeenCalledWith('splice', {
        array: a, i: 2, n: 2, removed: ['c', 'd'], added: ['C', 'D']
      });
    });
  });

  describe('change events', function() {
    var a, spy;

    class Test extends RynoObject {}
    Test.prop('x');
    Test.prop('y');

    beforeEach(function() {
      a = A(new Test({x: 1, y: 'a'}), new Test({x: 2, y: 'b'}), new Test({x: 3, y: 'c'}));
      spy = jasmine.createSpy();

      a.on('elementChange:*', spy);
    });

    it('emits an elementChange event when a property on an element of the array changes', function() {
      a.at(0).x = 10;
      expect(spy).toHaveBeenCalledWith('elementChange:x', {array: a, object: a.at(0), old: 1});
      a.at(1).y = 'foo';
      expect(spy).toHaveBeenCalledWith('elementChange:y', {array: a, object: a.at(1), old: 'b'});
    });

    it('emits an elementChange event when an added element changes', function() {
      var t = new Test({x: 4, y: 'd'});
      a.push(t);
      t.y = 'e';
      expect(spy).toHaveBeenCalledWith('elementChange:y', {array: a, object: t, old: 'd'});
    });

    it('does not emit an elementChange event when a removed element changes', function() {
      var t = a.pop();
      t.y = 'e';
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
