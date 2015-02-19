import BasisArray from "./array";

// Public: The `QueryArray` class is a subclass of `Basis.Array` that can be used to load a
// collection of model objects from the model class's mapper. An instance of this class is returned
// by `Basis.Model.buildQuery` and `Basis.Model.query`.
var QueryArray = BasisArray.extend('Basis.QueryArray', function() {
  this.prop('isBusy');

  this.prop('error');

  // Public: Metadata provided by the mapper. May be used for paging.
  this.prop('meta');

  this.prototype.init = function(modelClass) {
    QueryArray.__super__.init.call(this);
    this.modelClass  = modelClass;
    this.isBusy      = false;
    this.__promise__ = Promise.resolve();
  };

  // Public: Execute a query by invoking the `query` method on the modelClass's mapper. This will
  // but the array into a busy state (indicated by the `isBusy` property) until the mapper has
  // fulfilled its promise. When the promise is successfully resolved, the returned data is loaded
  // via `Basis.Model.loadAll` and the materialzed models are replaced into the array. When the
  // promise is rejected, the error message returned by the mapper is made available on the `error`
  // property.
  //
  // If this method is called while the array is currently busy, then the call to the mapper is
  // queued until the current query completes.
  //
  // opts - An object to pass along to the mapper (default: `{}`).
  //
  // Returns the receiver.
  this.prototype.query = function(opts = {}) {
    if (this.isBusy) {
      if (!this.__queued__) {
        this.__promise__ = this.__promise__.then(() => {
          this.query(this.__queued__);
          delete this.__queued__;
          return this.__promise__;
        });
      }

      this.__queued__ = opts;
    }
    else {
      this.isBusy = true;
      this.__promise__ = this.modelClass._callMapper('query', [opts]).then(
        (result) => {
          try {
            if (Array.isArray(result)) {
              this.replace(this.modelClass.loadAll(result));
            }
            else if (result.results) {
              this.replace(this.modelClass.loadAll(result.results));
              this.meta = result.meta;
            }
          }
          catch (e) { console.error(e); throw e; }
          this.isBusy = false;
          this.error = undefined;
        },
        (e) => {
          this.isBusy = false;
          this.error = e;
          throw e;
        }
      );
    }

    return this;
  };

  // Public: Registers fulfillment and rejection handlers on the latest promise object returned by
  // the modelClass's mapper. If the `query` method has yet to be called, then the `onFulfilled`
  // handler is invoked immediately.
  //
  // When resolved, the `onFulfilled` handler is called with no arguments. When rejected, the
  // `onFulfilled` handler is called with the error message from the mapper.
  //
  // onFulfilled - A function to be invoked when the latest promise from the mapper is resolved.
  // onRejected  - A function to be invoked when the latest promise from the mapper is rejected.
  //
  // Returns a new `Promise` that will be resolved with the return value of `onFulfilled`.
  this.prototype.then = function(f1, f2) { return this.__promise__.then(f1, f2); };

  // Public: Registers a rejection handler on the latest promise object returned by the modelClass's
  // mapper.
  //
  // onRejected - A function to be invoked when the latest promise from the mapper is rejected.
  //
  // Returns a new `Promise` that is resolved to the return value of the callback if it is called.
  this.prototype.catch = function(f) { return this.__promise__.catch(f); };
});

export default QueryArray;
