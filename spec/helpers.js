import "es6-shim";
import * as util from "../util";
import TransisObject from "../object";

function delay(f) { setTimeout(f, 10); }
function jasmineToString() { return this.toString(); }

beforeEach(function() {
  spyOn(console, 'error');
  spyOn(console, 'warn');
  jasmine.addCustomEqualityTester(util.eq);
  this.delay = delay;
  TransisObject.prototype.jasmineToString = jasmineToString;
});

afterEach(function() {
  TransisObject.flush();
});
