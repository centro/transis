"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

require("es6-shim");

var util = _interopRequireWildcard(require("../util"));

var BasisObject = _interopRequire(require("../object"));

beforeEach(function () {
  spyOn(console, "error");
  spyOn(console, "warn");
  jasmine.addCustomEqualityTester(function (a, b) {
    return util.eq(a, b);
  });
  this.delay = function (f) {
    setTimeout(f, 5);
  };
});

afterEach(function () {
  BasisObject.flush();
});
