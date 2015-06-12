import "es6-shim";
import * as util from "../util";
import BasisObject from "../object";

function delay(f) { setTimeout(f, 5); }
function jasmineToString() { return this.toString(); }

beforeEach(function() {
  spyOn(console, 'error');
  spyOn(console, 'warn');
  jasmine.addCustomEqualityTester(util.eq);
  this.delay = delay;
  BasisObject.prototype.jasmineToString = jasmineToString;
});

afterEach(function() {
  BasisObject.flush();
});
