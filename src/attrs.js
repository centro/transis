import * as parsers from "./parsers";

export var IdentityAttr = {
  coerce: function(v) { return v; },
  serialize: function(v) { return v; }
};

export var StringAttr = {
  coerce: function(v) { return v != null ? String(v) : v; },
  serialize: function(s) { return s; }
};

export var NumberAttr = {
  coerce: function(v) {
    if (typeof v === 'number') { return v; }
    else if (typeof v === 'string') { return parsers.parseNumber(v); }
    else { return null; }
  },

  serialize: function(n) { return n; }
};

export var BooleanAttr = {
  coerce: function(v) { return !!v; },
  serialize: function(b) { return b; }
};

export var DateAttr = {
  coerce: function(v) {
    if (v == null || v instanceof Date) { return v; }
    if (typeof v === 'number') { return new Date(v); }

    if (typeof v !== 'string') {
      throw new Error(`Ryno.DateAttr#coerce: don't know how to coerce \`${v}\` to a Date`);
    }

    return parsers.parseDate(v);
  },

  serialize: function(date) {
    return date instanceof Date ? date.toJSON().replace(/T.*$/, '') : date;
  }
};

export var DateTimeAttr = {
  coerce: function(v) {
    if (v == null || v instanceof Date) { return v; }
    if (typeof v === 'number') { return new Date(v); }

    if (typeof v !== 'string') {
      throw new Error(`Ryno.DateTimeAttr#coerce: don't know how to coerce \`${v}\` to a Date`);
    }

    return parsers.parseDateTime(v);
  },

  serialize: function(date) {
    return date instanceof Date ? date.toJSON() : date;
  }
};
