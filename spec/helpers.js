import "es6-shim";
import * as util from "../util";

beforeEach(function() {
  jasmine.addCustomEqualityTester(function(a, b) { return util.eq(a, b); });
});
