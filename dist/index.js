"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _object = require("./object");

var _object2 = _interopRequireDefault(_object);

var _array = require("./array");

var _array2 = _interopRequireDefault(_array);

var _model = require("./model");

var _model2 = _interopRequireDefault(_model);

var _id_map = require("./id_map");

var _id_map2 = _interopRequireDefault(_id_map);

var _react = require("./react");

var react = _interopRequireWildcard(_react);

var _util = require("./util");

var util = _interopRequireWildcard(_util);

var _parsers = require("./parsers");

var parsers = _interopRequireWildcard(_parsers);

var _pluralize = require("pluralize");

var _pluralize2 = _interopRequireDefault(_pluralize);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Public: Resets Transis by clearing the ID map and clearing out the pending change queue. This
// should only ever be used in specs.
function reset() {
  _id_map2.default.clear();
  _object2.default.clearChangeQueue();
}

exports.default = Object.assign({
  Object: _object2.default,
  Array: _array2.default,
  A: _array2.default.of,
  Model: _model2.default,
  pluralize: _pluralize2.default,
  ReactPropsMixin: react.PropsMixin,
  ReactStateMixin: react.StateMixin,
  reset: reset
}, util, parsers);
module.exports = exports["default"];
