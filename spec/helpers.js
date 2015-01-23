import "es6-shim";
import * as util from "../util";

beforeEach(function() {
  jasmine.addCustomEqualityTester(function(a, b) { return util.eq(a, b); });
  this.delay = function(f) { setTimeout(f, 2); };
});
