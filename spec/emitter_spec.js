import "6to5/polyfill";
import Emitter from "../emitter";

class Foo {
  methHandler1() {}
  methHandler2() {}
  methHandler3() {}
}
Object.assign(Foo.prototype, Emitter);

class Bar {
  methHandler1() {}
  methHandler2() {}
}
Object.assign(Bar.prototype, Emitter);

var f, b, funcHandler1, funcHandler2 = null;

describe('Emitter', function() {
  beforeEach(function() {
    f = new Foo;
    b = new Bar;

    funcHandler1 = jasmine.createSpy('funcHandler1');
    funcHandler2 = jasmine.createSpy('funcHandler2');

    spyOn(f, 'methHandler1');
    spyOn(f, 'methHandler2');
    spyOn(f, 'methHandler3');
    spyOn(b, 'methHandler1');
    spyOn(b, 'methHandler2');
  });

  describe('#on', function() {
    describe('with a string handler, no `observer` option, and the `fire` option set', function() {
      it('invokes the method indicated by the string handler on the receiver', function() {
        f.on('change', 'methHandler1', {fire: true});
        expect(f.methHandler1).toHaveBeenCalledWith('change', undefined);
      });
    });

    describe('with a string handler, an `observer` option, and the `fire` option set', function() {
      it('invokes the method indicated by the string handler on the `observer` object', function() {
        f.on('change', 'methHandler1', {observer: b, fire: true});
        expect(f.methHandler1).not.toHaveBeenCalled()
        expect(b.methHandler1).toHaveBeenCalledWith('change', undefined)
      });
    });

    describe('with a function handler, no `observer` option, and the `fire` option set', function() {
      it('invokes the function with the receiver as the context', function() {
        var handler = jasmine.createSpy();
        f.on('change', handler, {fire: true});
        expect(handler.calls.mostRecent().object).toBe(f);
      });
    });

    describe('with a function handler, an `observer` option, and the `fire` option set', function() {
      it('invokes the function with the `observer` object as the context', function() {
        var handler = jasmine.createSpy();
        f.on('change', handler, {observer: b, fire: true});
        expect(handler.calls.mostRecent().object).toBe(b);
      });
    });
  });

  describe('#off', function() {
    describe('with an event and handler', function() {
      beforeEach(function() {
        f.on('event1', funcHandler1);
        f.on('event1', 'methHandler1');
      });

      it('removes all registrations for the exact event and handler', function() {
        f.emit('event1');
        expect(funcHandler1.calls.count()).toBe(1);
        expect(f.methHandler1.calls.count()).toBe(1);

        f.off('event1', funcHandler1);
        f.emit('event1');
        expect(funcHandler1.calls.count()).toBe(1);
        expect(f.methHandler1.calls.count()).toBe(2);

        f.off('event1', 'methHandler1');
        f.emit('event1');
        expect(funcHandler1.calls.count()).toBe(1);
        expect(f.methHandler1.calls.count()).toBe(2);
      });
    });

    describe('with just an event', function() {
      beforeEach(function() {
        f.on('event1', funcHandler1);
        f.on('event1', 'methHandler1');
      });

      it('removes all registrations that match the event, regardless of the handler', function() {
        f.emit('event1');
        expect(funcHandler1.calls.count()).toBe(1);
        expect(f.methHandler1.calls.count()).toBe(1);

        f.off('event1');
        f.emit('event1');
        expect(funcHandler1.calls.count()).toBe(1);
        expect(f.methHandler1.calls.count()).toBe(1);
      });
    });

    describe('with an event, a handler, and an observer option', function() {
      it('removes the registrations that match the event, handler, and observer', function() {
        var a = {}, b = {};

        f.on('event1', funcHandler1, {observer: a});
        f.on('event1', funcHandler1, {observer: b});

        f.emit('event1');
        expect(funcHandler1.calls.count()).toBe(2);

        f.off('event1', funcHandler1, {observer: a});
        f.emit('event1');
        expect(funcHandler1.calls.count()).toBe(3);
      });
    });

    describe('with an event, a handler, and a context option', function() {
      it('removes the registrations that match the event, handler, and context', function() {
        f.on('foo', 'methHandler1', {context: 'a'});
        f.on('foo', 'methHandler1', {context: 'b'});

        f.emit('foo');
        expect(f.methHandler1.calls.count()).toBe(2);

        f.off('foo', 'methHandler1', {context: 'a'});
        f.emit('foo');
        expect(f.methHandler1.calls.count()).toBe(3);
      });
    });

    describe('with a null event and a handler', function() {
      it('removes the registrations that match the handler only', function() {
        f.on('foo', 'methHandler1');
        f.on('bar', 'methHandler1');
        f.on('baz', 'methHandler1');

        f.emit('foo').emit('bar').emit('baz');
        expect(f.methHandler1.calls.count()).toBe(3);

        f.off(null, 'methHandler1');
        f.emit('foo').emit('bar').emit('baz');
        expect(f.methHandler1.calls.count()).toBe(3);
      });
    });

    describe('with a null event, a null handler, and an observer option', function() {
      it('removes the registrations that match the observer only', function() {
        f.on('foo', 'methHandler1', {observer: b});
        f.on('bar', 'methHandler2', {observer: b});
        f.on('baz', 'methHandler1');

        f.emit('foo').emit('bar').emit('baz');

        expect(b.methHandler1.calls.count()).toBe(1);
        expect(b.methHandler2.calls.count()).toBe(1);
        expect(f.methHandler1.calls.count()).toBe(1);

        f.off(null, null, {observer: b});
        f.emit('foo').emit('bar').emit('baz');
        expect(b.methHandler1.calls.count()).toBe(1);
        expect(b.methHandler2.calls.count()).toBe(1);
        expect(f.methHandler1.calls.count()).toBe(2);
      });
    });

    describe('with a null event, a null handler, and a context option', function() {
      it('removes the registrations that match the context only', function() {
        f.on('foo', 'methHandler1', {context: 'a'});
        f.on('bar', 'methHandler2', {context: 'a'});
        f.on('baz', 'methHandler3', {context: 'b'});

        f.emit('foo').emit('bar').emit('baz');

        expect(f.methHandler1.calls.count()).toBe(1);
        expect(f.methHandler2.calls.count()).toBe(1);
        expect(f.methHandler3.calls.count()).toBe(1);

        f.off(null, null, {context: 'a'});
        f.emit('foo').emit('bar').emit('baz');
        expect(f.methHandler1.calls.count()).toBe(1);
        expect(f.methHandler2.calls.count()).toBe(1);
        expect(f.methHandler3.calls.count()).toBe(2);
      });
    });

    describe('with no arguments', function() {
      it('removes all registrations', function() {
        f.on('foo', 'methHandler1');
        f.on('foo', 'methHandler2');
        f.on('foo', 'methHandler2', {observer: b});
        f.on('foo', 'methHandler3', {context: 'x'});
        f.on('bar', 'methHandler1');

        f.emit('foo').emit('bar');

        expect(f.methHandler1.calls.count()).toBe(2);
        expect(f.methHandler2.calls.count()).toBe(1);
        expect(f.methHandler3.calls.count()).toBe(1);
        expect(b.methHandler2.calls.count()).toBe(1);

        f.off();
        f.emit('foo').emit('bar');
        expect(f.methHandler1.calls.count()).toBe(2);
        expect(f.methHandler2.calls.count()).toBe(1);
        expect(f.methHandler3.calls.count()).toBe(1);
        expect(b.methHandler2.calls.count()).toBe(1);
      });
    });
  });

  describe('#emit', function() {
    describe('with a registration created with a string handler and no `observer` option', function() {
      it('invokes the method indicated by the string handler on the receiver', function() {
        f.on('change', 'methHandler1');
        f.emit('change');
        expect(f.methHandler1).toHaveBeenCalledWith('change', undefined);
      });
    });

    describe('with a registration created with a string handler and an `observer` option', function() {
      it('invokes the method indicated by the string handler on the `observer` object', function() {
        f.on('change', 'methHandler1', {observer: b});
        f.emit('change');
        expect(f.methHandler1).not.toHaveBeenCalled()
        expect(b.methHandler1).toHaveBeenCalledWith('change', undefined);
      });
    });

    describe('with a registration created with a function handler and no `observer` option', function() {
      it('invokes the function in the context of the receiver', function() {
        var handler = jasmine.createSpy();

        f.on('change', handler);
        f.emit('change');
        expect(handler.calls.mostRecent().object).toBe(f);
      });
    });

    describe('with a registration created with a function handler and an `observer` option', function() {
      it('invokes the handler function in the context of the `observer` object', function() {
        var handler = jasmine.createSpy();

        f.on('change', handler, {observer: b});
        f.emit('change');
        expect(handler.calls.mostRecent().object).toBe(b);
      });
    });

    describe('with a registration created with the `once` option', function() {
      it('removes the registration so that the handler is no longer invoked on subsequent events', function() {
        f.on('change', 'methHandler1', {once: true});
        f.emit('change');
        expect(f.methHandler1.calls.count()).toBe(1);
        f.emit('change');
        expect(f.methHandler1.calls.count()).toBe(1);
      });
    });

    describe('with a registration created with a `context` option', function() {
      it('adds the context object to the notification passed to handlers', function() {
        f.on('foo', 'methHandler1', {context: 'hello'});
        f.emit('foo');
        expect(f.methHandler1).toHaveBeenCalledWith('foo', undefined, 'hello');
      });
    });

    describe('with a `data` argument', function() {
      it('passes the `data` argument to the handlers', function() {
        f.on('foo', 'methHandler1');
        f.emit('foo', 9);
        expect(f.methHandler1).toHaveBeenCalledWith('foo', 9);
      });
    });

    describe('with non-namespaced events', function() {
      it('triggers registrations that match the event name exactly', function() {
        f.on('foo', 'methHandler1');
        f.emit('foo');
        expect(f.methHandler1).toHaveBeenCalledWith('foo', undefined);
      });

      it("triggers '*' registrations", function() {
        f.on('*', 'methHandler1');
        f.emit('foo');
        expect(f.methHandler1).toHaveBeenCalledWith('foo', undefined);
      });

      it('does not trigger registrations for other events', function() {
        f.on('bar', 'methHandler1');
        f.emit('foo');
        expect(f.methHandler1).not.toHaveBeenCalled();
      });

      it('does not trigger registrations for a namespace', function() {
        f.on('foo:bar', 'methHandler1');
        f.emit('foo');
        expect(f.methHandler1).not.toHaveBeenCalled();
      });
    });

    describe('with namespaced events', function() {
      it('triggers registrations that match the event exactly', function() {
        f.on('foo:bar', 'methHandler1');
        f.emit('foo:bar');
        expect(f.methHandler1).toHaveBeenCalledWith('foo:bar', undefined);
      })

      it("triggers registrations that match the type and have a namespace of '*'", function() {
        f.on('foo:*', 'methHandler1');
        f.emit('foo:bar');
        expect(f.methHandler1).toHaveBeenCalledWith('foo:bar', undefined);
      });

      it("triggers registrations that have a type of '*' and match the namespace exactly", function() {
        f.on('*:bar', 'methHandler1');
        f.emit('foo:bar');
        expect(f.methHandler1).toHaveBeenCalledWith('foo:bar', undefined);
      });

      it("triggers registrations that have a type of '*' and a namespace of '*'", function() {
        f.on('*:*', 'methHandler1');
        f.emit('foo:bar');
        expect(f.methHandler1).toHaveBeenCalledWith('foo:bar', undefined);
      });

      it("triggers '*' registrations", function() {
        f.on('*', 'methHandler1');
        f.emit('foo:bar');
        expect(f.methHandler1).toHaveBeenCalledWith('foo:bar', undefined);
      });

      it('does not trigger registrations where just the type matches', function() {
        f.on('foo:quux', 'methHandler1');
        f.emit('foo:bar');
        expect(f.methHandler1).not.toHaveBeenCalled();
      });

      it('does not trigger registrations where just the namespace matches', function() {
        f.on('abc:bar', 'methHandler1');
        f.emit('foo:bar');
        expect(f.methHandler1).not.toHaveBeenCalled();
      });

      it('does not trigger registrations for just the event type', function() {
        f.on('foo', 'methHandler1');
        f.emit('foo:bar');
        expect(f.methHandler1).not.toHaveBeenCalled();
      });
    });

    it('returns the receiver', function() {
      expect(f.emit('change')).toBe(f);
    });
  });
});

