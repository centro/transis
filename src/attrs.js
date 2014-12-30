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
