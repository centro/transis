import "6to5/polyfill";
import * as attrs from "../attrs";

describe('IdentityAttr#coerce', function() {
  it('returns the given argument', function() {
    expect(attrs.IdentityAttr.coerce(9)).toBe(9);
    expect(attrs.IdentityAttr.coerce('abc')).toBe('abc');
    expect(attrs.IdentityAttr.coerce(null)).toBeNull();
    expect(attrs.IdentityAttr.coerce(undefined)).toBeUndefined();
  });
});

describe('IdentityAttr#serialize', function() {
  it('returns the given argument', function() {
    expect(attrs.IdentityAttr.serialize(9)).toBe(9);
    expect(attrs.IdentityAttr.serialize('abc')).toBe('abc');
    expect(attrs.IdentityAttr.serialize(null)).toBeNull();
    expect(attrs.IdentityAttr.serialize(undefined)).toBeUndefined();
  });
});

describe('StringAttr#coerce', function() {
  it('converts the given value to a string for non-null non-undefined values', function() {
    expect(attrs.StringAttr.coerce('abc')).toBe('abc');
    expect(attrs.StringAttr.coerce(9)).toBe('9');
    expect(attrs.StringAttr.coerce(/xy/)).toBe('/xy/');
    expect(attrs.StringAttr.coerce({})).toBe('[object Object]');
  });

  it('does not convert null and undefined values', function() {
    expect(attrs.StringAttr.coerce(null)).toBeNull();
    expect(attrs.StringAttr.coerce(undefined)).toBeUndefined();
  });
});

describe('StringAttr#serialize', function() {
  it('returns the given value', function() {
    expect(attrs.StringAttr.serialize('abc')).toBe('abc');
    expect(attrs.StringAttr.serialize(null)).toBeNull();
    expect(attrs.StringAttr.serialize(undefined)).toBeUndefined();
  });
});

describe('NumberAttr#coerce', function() {
  it('returns the given number', function() {
    expect(attrs.NumberAttr.coerce(9)).toBe(9);
    expect(attrs.NumberAttr.coerce(3.14)).toBe(3.14);
  });

  it('parses the given string to a number', function() {
    expect(attrs.NumberAttr.coerce('9')).toBe(9);
    expect(attrs.NumberAttr.coerce('3.14')).toBe(3.14);
    expect(attrs.NumberAttr.coerce('xyz')).toBeNull();
  });

  it('returns null when given something other than a number or string', function() {
    expect(attrs.NumberAttr.coerce(null)).toBeNull();
    expect(attrs.NumberAttr.coerce(undefined)).toBeNull();
    expect(attrs.NumberAttr.coerce({})).toBeNull();
  });
});

describe('NumberAttr#serialize', function() {
  it('returns its argument', function() {
    expect(attrs.NumberAttr.serialize(5)).toBe(5);
    expect(attrs.NumberAttr.serialize(null)).toBeNull();
    expect(attrs.NumberAttr.serialize(undefined)).toBeUndefined();
  });
});

describe('BooleanAttr#coerce', function() {
  it('converts the given value to a boolean', function() {
    expect(attrs.BooleanAttr.coerce(true)).toBe(true);
    expect(attrs.BooleanAttr.coerce(false)).toBe(false);
    expect(attrs.BooleanAttr.coerce(1)).toBe(true);
    expect(attrs.BooleanAttr.coerce('foo')).toBe(true);
    expect(attrs.BooleanAttr.coerce({})).toBe(true);
    expect(attrs.BooleanAttr.coerce(0)).toBe(false);
    expect(attrs.BooleanAttr.coerce('')).toBe(false);
    expect(attrs.BooleanAttr.coerce(null)).toBe(false);
    expect(attrs.BooleanAttr.coerce(undefined)).toBe(false);
  });
});

describe('BooleanAttr#serialize', function() {
  it('returns the argument', function() {
    expect(attrs.BooleanAttr.serialize(true)).toBe(true);
    expect(attrs.BooleanAttr.serialize(false)).toBe(false);
    expect(attrs.BooleanAttr.serialize(null)).toBeNull();
    expect(attrs.BooleanAttr.serialize(undefined)).toBeUndefined();
  });
});

describe('DateAttr#coerce', function() {
  it('returns the argument when its a Date object', function() {
    var d = new Date;
    expect(attrs.DateAttr.coerce(d)).toBe(d);
  });

  it('returns the argument when its null or undefined', function() {
    expect(attrs.DateAttr.coerce(null)).toBeNull();
    expect(attrs.DateAttr.coerce(undefined)).toBeUndefined();
  });

  it('converts numbers to Date objects', function() {
    var d1 = new Date(2014, 11, 29), d2 = new Date(0);
    expect(attrs.DateAttr.coerce(d1.valueOf())).toEqual(d1);
    expect(attrs.DateAttr.coerce(d2.valueOf())).toEqual(d2);
  });

  it('converts strings to Date objects', function() {
    expect(attrs.DateAttr.coerce('2014-12-29')).toEqual(new Date(2014, 11, 29));
  });

  it('throws an exception when given something other than a number or string', function() {
    expect(function() {
      attrs.DateAttr.coerce({});
    }).toThrow(new Error("Ryno.DateAttr#coerce: don't know how to coerce `[object Object]` to a Date"));
  });
});

describe('DateAttr#serialize', function() {
  it('converts the given Date to an ISO8601 formatted string', function() {
    expect(attrs.DateAttr.serialize(new Date(2014, 11, 29))).toEqual('2014-12-29');
    expect(attrs.DateAttr.serialize(new Date(2015, 0, 1))).toEqual('2015-01-01');
  });

  it('passes through null and undefined', function() {
    expect(attrs.DateAttr.serialize(null)).toBeNull();
    expect(attrs.DateAttr.serialize(undefined)).toBeUndefined();
  });
});

describe('DateTimeAttr#coerce', function() {
  it('returns the argument when its a Date object', function() {
    var d = new Date;
    expect(attrs.DateTimeAttr.coerce(d)).toBe(d);
  });

  it('returns the argument when its null or undefined', function() {
    expect(attrs.DateTimeAttr.coerce(null)).toBeNull();
    expect(attrs.DateTimeAttr.coerce(undefined)).toBeUndefined();
  });

  it('converts numbers to Date objects', function() {
    var d1 = new Date(2014, 11, 29), d2 = new Date(0);
    expect(attrs.DateTimeAttr.coerce(d1.valueOf())).toEqual(d1);
    expect(attrs.DateTimeAttr.coerce(d2.valueOf())).toEqual(d2);
  });

  it('converts strings to Date objects', function() {
    expect(attrs.DateTimeAttr.coerce('2013-03-29T09:49:30Z')).toEqual(new Date(Date.UTC(2013, 2, 29, 9, 49, 30, 0)));
  });

  it('throws an exception when given something other than a number or string', function() {
    expect(function() {
      attrs.DateTimeAttr.coerce({});
    }).toThrow(new Error("Ryno.DateTimeAttr#coerce: don't know how to coerce `[object Object]` to a Date"));
  });
});

describe('DateTimeAttr#serialize', function() {
  it('converts the given Date to an ISO8601 formatted string', function() {
    var t = new Date(Date.UTC(2013, 2, 29, 9, 49, 30, 0) + (6 * 60 * 60 * 1000));
    expect(attrs.DateTimeAttr.serialize(t)).toEqual('2013-03-29T15:49:30.000Z');
  });

  it('passes through null and undefined', function() {
    expect(attrs.DateTimeAttr.serialize(null)).toBeNull();
    expect(attrs.DateTimeAttr.serialize(undefined)).toBeUndefined();
  });
});
