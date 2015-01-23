import "es6-shim";
import Model from "../model";
import QueryArray from "../query_array";

describe('QueryArray', function () {
  var Test = Model.extend('Test', function() {
    this.attr('str', 'string');
    this.attr('num', 'number');
  });

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
      this.delay(() => {
        expect(this.a.isBusy).toBe(false);
        done();
      });
    });

    it('sets the isBusy property to false when the promise is rejected', function(done) {
      this.a.query();
      expect(this.a.isBusy).toBe(true);
      this.reject('foo');
      this.delay(() => {
        expect(this.a.isBusy).toBe(false);
        done();
      });
    });

    it('sets the error property when the promise is rejected', function(done) {
      this.a.query();
      this.reject('foobar');
      this.delay(() => {
        expect(this.a.error).toBe('foobar');
        done();
      });
    });

    it('clears the error property when the promise is resolved', function(done) {
      this.a.query();
      this.reject('foobar');
      this.delay(() => {
        expect(this.a.error).toBe('foobar');
        this.a.query();
        this.resolve([]);
        this.delay(() => {
          expect(this.a.error).toBeUndefined();
          done();
        });
      });
    });

    it('loads the resolved array of objects and replaces the contents of the array with the loaded models', function(done) {
      this.a.query();
      this.resolve([{id: 600, str: 's1'}, {id: 601, str: 's2'}]);
      this.delay(() => {
        expect(this.a.length).toBe(2);
        expect(this.a.at(0).id).toBe(600);
        expect(this.a.at(0).str).toBe('s1');
        expect(this.a.at(1).id).toBe(601);
        expect(this.a.at(1).str).toBe('s2');
        done();
      });
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
      this.delay(() => {
        expect(Test.mapper.query.calls.count()).toBe(2);
        expect(Test.mapper.query).toHaveBeenCalledWith({foo: 3});
        done();
      });
    });

    it('properly resolves the promise when the query is queued', function(done) {
      var spy1 = jasmine.createSpy(), spy2 = jasmine.createSpy();

      this.a.query({foo: 1}).then(spy1);
      this.a.query({foo: 2}).then(spy2);
      this.resolve([]);
      this.delay(function() {
        expect(spy1).toHaveBeenCalled();
        expect(spy2).not.toHaveBeenCalled();
        this.resolve([]);
        this.delay(function() {
          expect(spy2).toHaveBeenCalled();
          done();
        });
      }.bind(this));
    });

    it("throws an exception when the class's mapper is not defined", function() {
      var Foo = Model.extend('Foo');

      expect(function() {
        (new QueryArray(Foo)).query();
      }).toThrow(new Error('Foo._callMapper: no mapper defined, assign one to `Foo.mapper`'));
    });

    it("throws an exception when the class's mapper does not define a query method", function() {
      var Foo = Model.extend('Foo');
      Foo.mapper = {};

      expect(function() {
        (new QueryArray(Foo)).query();
      }).toThrow(new Error('Foo._callMapper: mapper does not implement `query`'));
    });

    it("throws an exception when the class's mapper.query method does not return a promise", function() {
      var Foo = Model.extend('Foo');
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
        this.delay(() => {
          expect(this.onFulfilled).toHaveBeenCalled();
          expect(this.onRejected).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('when called after the #query method', function() {
      it('invokes the fulfilled callback when the mapper fulfills its promise', function(done) {
        this.a.query().then(this.onFulfilled, this.onRejected);
        this.resolve([]);
        this.delay(() => {
          expect(this.onFulfilled).toHaveBeenCalled();
          expect(this.onRejected).not.toHaveBeenCalled();
          done();
        });
      });

      it('invokes the rejected callback when the mapper rejects its promise', function(done) {
        this.a.query().then(this.onFulfilled, this.onRejected);
        this.reject('foo');
        this.delay(() => {
          expect(this.onFulfilled).not.toHaveBeenCalled();
          expect(this.onRejected).toHaveBeenCalled();
          done();
        });
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
        this.delay(() => {
          expect(this.onRejected).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('when called after the #query method', function() {
      it('does nothing when the mapper fulfills its promise', function(done) {
        this.a.query().catch(this.onRejected);
        this.resolve([]);
        this.delay(() => {
          expect(this.onRejected).not.toHaveBeenCalled();
          done();
        });
      });

      it('invokes the callback when the mapper rejects its promise', function(done) {
        this.a.query().catch(this.onRejected);
        this.reject('foo');
        this.delay(() => {
          expect(this.onRejected).toHaveBeenCalledWith('foo');
          done();
        });
      });
    });
  });
});
