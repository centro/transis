"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var parsers = _interopRequireWildcard(require("./parsers"));

var IdentityAttr = exports.IdentityAttr = {
  coerce: function coerce(v) {
    return v;
  },
  serialize: function serialize(v) {
    return v;
  }
};

var StringAttr = exports.StringAttr = {
  coerce: function coerce(v) {
    return v != null ? String(v) : v;
  },
  serialize: function serialize(s) {
    return s;
  }
};

var NumberAttr = exports.NumberAttr = {
  coerce: function coerce(v) {
    if (typeof v === "number") {
      return v;
    } else if (typeof v === "string") {
      return parsers.parseNumber(v);
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
    return !!v;
  },
  serialize: function serialize(b) {
    return b;
  }
};

var DateAttr = exports.DateAttr = {
  coerce: function coerce(v) {
    if (v == null || v instanceof Date) {
      return v;
    }
    if (typeof v === "number") {
      return new Date(v);
    }

    if (typeof v !== "string") {
      throw new Error("Basis.DateAttr#coerce: don't know how to coerce `" + v + "` to a Date");
    }

    return parsers.parseDate(v);
  },

  serialize: function serialize(date) {
    return date instanceof Date ? date.toJSON().replace(/T.*$/, "") : date;
  }
};

var DateTimeAttr = exports.DateTimeAttr = {
  coerce: function coerce(v) {
    if (v == null || v instanceof Date) {
      return v;
    }
    if (typeof v === "number") {
      return new Date(v);
    }

    if (typeof v !== "string") {
      throw new Error("Basis.DateTimeAttr#coerce: don't know how to coerce `" + v + "` to a Date");
    }

    return parsers.parseDateTime(v);
  },

  serialize: function serialize(date) {
    return date instanceof Date ? date.toJSON() : date;
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
