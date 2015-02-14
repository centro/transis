import "es6-shim";
import * as util from "../util";

beforeEach(function() {
  spyOn(console, 'error');
  jasmine.addCustomEqualityTester(function(a, b) { return util.eq(a, b); });
  this.delay = function(f) { setTimeout(f, 5); };
});
