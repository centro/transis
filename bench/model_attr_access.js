'use strict';
/*

This benchmark compares the time it takes to access a Transis Model attribute vs
a POJO property.

Run benchmark from project root:

> BENCH_TYPE=obj node --allow-natives-syntax bench/model_attr_access.js
> BENCH_TYPE=model node --allow-natives-syntax bench/model_attr_access.js

*/

const transis = require('../dist');
const BENCH_TYPE = process.env.BENCH_TYPE;

console.log('BENCH_TYPE', BENCH_TYPE);


const TransisModel = transis.Model.extend('TransisModel', function() {
  this.attr('num', 'number');
});


const JSModel = function(obj) {
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


const makeObj =
    BENCH_TYPE === 'model' ? () => new TransisModel({num: 10})
  : BENCH_TYPE === 'proto' ? () => new JSModel({num: 10})
  : BENCH_TYPE === 'class' ? () => new ClassModel({num: 10})
  : BENCH_TYPE === 'obj'   ? () => ({ get num(){ return 10; } })
  : null;

const benchmark = (m)=> m.num

function runBenchmark(){
  const model = makeObj();
  let total = 0;
  let i = 0;

  // Use the result (sum), otherwise V8 optimizes the function call out! DCE FTW!
  for(; i<10000000; ++i) {
    total += benchmark(model);
  }

  return total;
}

// Allow v8 to collect type information
runBenchmark();
runBenchmark();

// Optimize benchmark function to ensure performance numbers are stable
// Otherwise, numbers may fluctuate because compiling and optimizing may or may not
// happen during the benchmark.
%OptimizeFunctionOnNextCall(benchmark);
runBenchmark();

// Run Benchmark
const start = Date.now();
const runitTotal = runBenchmark();
console.log(`${Date.now() - start} ms`);

// SANITY CHECK: Print out number and verify it matches expected result
console.log('total', runitTotal, runitTotal === 100000000);
