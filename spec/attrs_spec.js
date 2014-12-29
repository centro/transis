import "es6-shim";
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
