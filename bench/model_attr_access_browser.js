'use strict';
/*

This benchmark compares the time it takes to access a Transis Model attribute vs
a POJO property.  This benchmark is meant to be run in the browser.

file:///.../bench/model_attr_access.html#model
file:///.../bench/model_attr_access.html#proto
file:///.../bench/model_attr_access.html#class
file:///.../bench/model_attr_access.html#obj

*/

var BENCH_TYPE = window.location.hash.slice(1);

console.log('BENCH_TYPE', BENCH_TYPE);

var TransisModel = Transis.Model.extend('TransisModel', function() {
  this.attr('num', 'number');
});


var JSModel = function(obj) {
  this._num = obj.num;
}

Object.defineProperty(JSModel.prototype, 'num', {
  get() { return this._num; }
});


class ClassModel {
  constructor(obj) {
    this._num = obj.num;
  }
  get num() { return this._num; }
}


var makeObj =
    BENCH_TYPE === 'model' ? function(){ return new TransisModel({num: 10});   }
  : BENCH_TYPE === 'proto' ? function(){ return new JSModel({num: 10});        }
  : BENCH_TYPE === 'class' ? function(){ return new ClassModel({num: 10});     }
  : BENCH_TYPE === 'obj'   ? function(){ return ({ get num(){ return 10; } }); }
  : null;

var benchmark = function(m){ return m.num; }

function runBenchmark(){
  var model = makeObj();
  var total = 0;
  var i = 0;

  // Use the result (sum), otherwise V8 optimizes the function call out! DCE FTW!
  for(; i<10000000; ++i) {
    total += benchmark(model);
  }

  return total;
}

// Run Benchmark
var start = Date.now();
var runitTotal = runBenchmark();
console.log(`${Date.now() - start} ms`);

// SANITY CHECK: Print out number and verify it matches expected result
console.log('total', runitTotal, runitTotal === 100000000);
