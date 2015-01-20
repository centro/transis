import "es6-shim";
import Model from "../model";
import QueryArray from "../query_array";

describe('QueryArray', function () {
  class Test extends Model {}
  Test.attr('str', 'string');
  Test.attr('num', 'number');
  Model.registerClass(Test);

  beforeEach(function() {
    var _this = this;

    Test.mapper = {
      query: function() {
        return new Promise(function(resolve, reject) {
          _this.resolve = resolve;
          _this.reject = reject;
        });
      }
    };

    spyOn(Test.mapper, 'query').and.callThrough();

    this.a = new QueryArray(Test);
  });

  describe('#query', function() {
    it('invokes the query method on the data mapper', function() {
      this.a.query();
      expect(Test.mapper.query).toHaveBeenCalledWith({});
    });

    it('forwards the first argument to the data mapper', function() {
      this.a.query({foo: 9, bar: 'baz'});
      expect(Test.mapper.query).toHaveBeenCalledWith({foo: 9, bar: 'baz'});
    });

    it('sets the isBusy property', function() {
      expect(this.a.isBusy).toBe(false);
      this.a.query();
      expect(this.a.isBusy).toBe(true);
    });

    it('sets the isBusy property to false when the promise is resolved', function(done) {
      this.a.query();
      expect(this.a.isBusy).toBe(true);
      this.resolve([]);
      setTimeout(() => {
        expect(this.a.isBusy).toBe(false);
        done();
      }, 10);
    });

    it('sets the isBusy property to false when the promise is rejected', function(done) {
      this.a.query();
      expect(this.a.isBusy).toBe(true);
      this.reject('foo');
      setTimeout(() => {
        expect(this.a.isBusy).toBe(false);
        done();
      }, 10);
    });

    it('sets the error property when the promise is rejected', function(done) {
      this.a.query();
      this.reject('foobar');
      setTimeout(() => {
        expect(this.a.error).toBe('foobar');
        done();
      }, 10);
    });

    it('clears the error property when the promise is resolved', function(done) {
      this.a.query();
      this.reject('foobar');
      setTimeout(() => {
        expect(this.a.error).toBe('foobar');
        this.a.query();
        this.resolve([]);
        setTimeout(() => {
          expect(this.a.error).toBeUndefined();
          done();
        }, 10);
      }, 10);
    });

    it('loads the resolved array of objects and replaces the contents of the array with the loaded models', function(done) {
      this.a.query();
      this.resolve([{id: 600, str: 's1'}, {id: 601, str: 's2'}]);
      setTimeout(() => {
        expect(this.a.length).toBe(2);
        expect(this.a.at(0).id).toBe(600);
        expect(this.a.at(0).str).toBe('s1');
        expect(this.a.at(1).id).toBe(601);
        expect(this.a.at(1).str).toBe('s2');
        done();
      }, 10);
    });

    it("does not invoke the mapper's query method when the array is busy", function() {
      this.a.query().query();
      expect(Test.mapper.query.calls.count()).toBe(1);
    });

    it('queues the latest call to query when the array is busy and invokes the query method on the mapper when the in progress query finishes', function(done) {
      this.a.query({foo: 1});
      expect(this.a.isBusy).toBe(true);
      this.a.query({foo: 2});
      this.a.query({foo: 3});
      expect(Test.mapper.query.calls.count()).toBe(1);
      expect(Test.mapper.query).toHaveBeenCalledWith({foo: 1});
      this.resolve([]);
      setTimeout(() => {
        expect(Test.mapper.query.calls.count()).toBe(2);
        expect(Test.mapper.query).toHaveBeenCalledWith({foo: 3});
        done();
      }, 10);
    });

    it('properly resolves the promise when the query is queued', function(done) {
      var spy1 = jasmine.createSpy(), spy2 = jasmine.createSpy();

      this.a.query({foo: 1}).then(spy1);
      this.a.query({foo: 2}).then(spy2);
      this.resolve([]);
      setTimeout(function() {
        expect(spy1).toHaveBeenCalled();
        expect(spy2).not.toHaveBeenCalled();
        this.resolve([]);
        setTimeout(function() {
          expect(spy2).toHaveBeenCalled();
          done();
        }, 10);
      }.bind(this), 10);
    });

    it("throws an exception when the class's mapper is not defined", function() {
      class Foo extends Model {}

      expect(function() {
        (new QueryArray(Foo)).query();
      }).toThrow(new Error('Foo._callMapper: no mapper defined, assign one to `Foo.mapper`'));
    });

    it("throws an exception when the class's mapper does not define a query method", function() {
      class Foo extends Model {}
      Foo.mapper = {};

      expect(function() {
        (new QueryArray(Foo)).query();
      }).toThrow(new Error('Foo._callMapper: mapper does not implement `query`'));
    });

    it("throws an exception when the class's mapper.query method does not return a promise", function() {
      class Foo extends Model {}
      Foo.mapper = {query: function() {}};

      expect(function() {
        (new QueryArray(Foo)).query();
      }).toThrow(new Error("Foo._callMapper: mapper's `query` method did not return a Promise"));
    });
  });

  describe('#then', function() {
    beforeEach(function() {
      this.onFulfilled = jasmine.createSpy('onFulfilled');
      this.onRejected  = jasmine.createSpy('onRejected');
    });

    describe('when called before the #query method', function() {
      it('invokes the fulfilled callback', function(done) {
        this.a.then(this.onFulfilled, this.onRejected);
        setTimeout(() => {
          expect(this.onFulfilled).toHaveBeenCalled();
          expect(this.onRejected).not.toHaveBeenCalled();
          done();
        }, 10);
      });
    });

    describe('when called after the #query method', function() {
      it('invokes the fulfilled callback when the mapper fulfills its promise', function(done) {
        this.a.query().then(this.onFulfilled, this.onRejected);
        this.resolve([]);
        setTimeout(() => {
          expect(this.onFulfilled).toHaveBeenCalled();
          expect(this.onRejected).not.toHaveBeenCalled();
          done();
        }, 10);
      });

      it('invokes the rejected callback when the mapper rejects its promise', function(done) {
        this.a.query().then(this.onFulfilled, this.onRejected);
        this.reject('foo');
        setTimeout(() => {
          expect(this.onFulfilled).not.toHaveBeenCalled();
          expect(this.onRejected).toHaveBeenCalled();
          done();
        }, 10);
      });
    });
  });

  describe('#catch', function() {
    beforeEach(function() {
      this.onRejected = jasmine.createSpy('onRejected');
    });

    describe('when called before the #query method', function() {
      it('does nothing', function(done) {
        this.a.catch(this.onRejected);
        setTimeout(() => {
          expect(this.onRejected).not.toHaveBeenCalled();
          done();
        }, 10);
      });
    });

    describe('when called after the #query method', function() {
      it('does nothing when the mapper fulfills its promise', function(done) {
        this.a.query().catch(this.onRejected);
        this.resolve([]);
        setTimeout(() => {
          expect(this.onRejected).not.toHaveBeenCalled();
          done();
        }, 10);
      });

      it('invokes the callback when the mapper rejects its promise', function(done) {
        this.a.query().catch(this.onRejected);
        this.reject('foo');
        setTimeout(() => {
          expect(this.onRejected).toHaveBeenCalledWith('foo');
          done();
        }, 10);
      });
    });
  });
});
