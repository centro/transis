'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DateTimeAttr = exports.DateAttr = exports.BooleanAttr = exports.NumberAttr = exports.IntegerAttr = exports.StringAttr = exports.IdentityAttr = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _parsers = require('./parsers');

var parsers = _interopRequireWildcard(_parsers);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var IdentityAttr = exports.IdentityAttr = {
  coerce: function coerce(v) {
    return v;
  },
  serialize: function serialize(v) {
    return v;
  }
};

var StringAttr = exports.StringAttr = function () {
  function StringAttr() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, StringAttr);

    this.opts = Object.assign({ trim: true }, opts);
  }

  _createClass(StringAttr, [{
    key: 'coerce',
    value: function coerce(v) {
      v = v != null ? String(v) : v;
      if (typeof v === 'string' && this.opts.trim) {
        v = v.trim();
      }
      return v;
    }
  }, {
    key: 'serialize',
    value: function serialize(s) {
      return s;
    }
  }]);

  return StringAttr;
}();

var IntegerAttr = exports.IntegerAttr = {
  coerce: function coerce(v) {
    if (typeof v === 'number') {
      return Math.round(v);
    } else if (typeof v === 'string') {
      var parsed = parsers.parseNumber(v);
      return parsed ? Math.round(parsed) : parsed;
    } else if (v === undefined) {
      return undefined;
    } else {
      return null;
    }
  },
  serialize: function serialize(n) {
    return n;
  }
};

var NumberAttr = exports.NumberAttr = {
  coerce: function coerce(v) {
    if (typeof v === 'number') {
      return v;
    } else if (typeof v === 'string') {
      return parsers.parseNumber(v);
    } else if (v === undefined) {
      return undefined;
    } else {
      return null;
    }
  },
  serialize: function serialize(n) {
    return n;
  }
};

var BooleanAttr = exports.BooleanAttr = {
  coerce: function coerce(v) {
    return v === undefined ? v : !!v;
  },
  serialize: function serialize(b) {
    return b;
  }
};

function format2Digits(num) {
  return num < 10 ? '0' + num : num;
}

var DateAttr = exports.DateAttr = {
  coerce: function coerce(v) {
    if (v == null || v instanceof Date) {
      return v;
    }
    if (typeof v === 'number') {
      return new Date(v);
    }

    if (typeof v !== 'string') {
      throw new Error('Transis.DateAttr#coerce: don\'t know how to coerce `' + v + '` to a Date');
    }

    return parsers.parseDate(v);
  },
  serialize: function serialize(date) {
    if (date instanceof Date) {
      return date.getFullYear() + '-' + format2Digits(date.getMonth() + 1) + '-' + format2Digits(date.getDate());
    } else {
      return date;
    }
  }
};

var DateTimeAttr = exports.DateTimeAttr = {
  coerce: function coerce(v) {
    if (v == null || v instanceof Date) {
      return v;
    }
    if (typeof v === 'number') {
      return new Date(v);
    }

    if (typeof v !== 'string') {
      throw new Error('Transis.DateTimeAttr#coerce: don\'t know how to coerce `' + v + '` to a Date');
    }

    return parsers.parseDateTime(v);
  },
  serialize: function serialize(date) {
    return date instanceof Date ? date.toJSON() : date;
  }
};
