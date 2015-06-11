"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

require("es6-shim");

var _util = require("../util");

var util = _interopRequireWildcard(_util);

var _object = require("../object");

var _object2 = _interopRequireDefault(_object);

function delay(f) {
  setTimeout(f, 5);
}
function jasmineToString() {
  return this.toString();
};

beforeEach(function () {
  spyOn(console, "error");
  spyOn(console, "warn");
  jasmine.addCustomEqualityTester(util.eq);
  this.delay = delay;
  _object2["default"].prototype.jasmineToString = jasmineToString;
});

afterEach(function () {
  _object2["default"].flush();
});
