import "es6-shim";
import * as util from "../util";
import BasisObject from "../object";

beforeEach(function() {
  spyOn(console, 'error');
  spyOn(console, 'warn');
  jasmine.addCustomEqualityTester(function(a, b) { return util.eq(a, b); });
  this.delay = function(f) { setTimeout(f, 5); };
});

afterEach(function() {
  BasisObject.flush();
});
