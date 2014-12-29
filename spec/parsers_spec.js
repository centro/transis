import "es6-shim";
import * as parsers from "../parsers";

describe('parseNumber', function() {
  it('returns null when given unparseable strings', function() {
    expect(parsers.parseNumber('foo')).toBeNull();
    expect(parsers.parseNumber('')).toBeNull();
    expect(parsers.parseNumber('.')).toBeNull();
  });

  it('converts the given string to a number', function() {
    expect(parsers.parseNumber('4')).toBe(4);
    expect(parsers.parseNumber('44')).toBe(44);
    expect(parsers.parseNumber('3.14')).toBe(3.14);
    expect(parsers.parseNumber('-9.5')).toBe(-9.5);
    expect(parsers.parseNumber('4,123')).toBe(4123);
    expect(parsers.parseNumber(' 12,345   ')).toBe(12345);
    expect(parsers.parseNumber(' 12,345   ')).toBe(12345);
    expect(parsers.parseNumber('-121')).toBe(-121);
    expect(parsers.parseNumber(' -  8')).toBe(-8);
    expect(parsers.parseNumber('.5')).toBe(0.5);
    expect(parsers.parseNumber('-.5')).toBe(-0.5);
    expect(parsers.parseNumber('10.')).toBe(10);
    expect(parsers.parseNumber('-10.')).toBe(-10);
    expect(parsers.parseNumber('0')).toBe(0);
    expect(parsers.parseNumber('0.0')).toBe(0);
    expect(parsers.parseNumber('.0')).toBe(0);
    expect(parsers.parseNumber('0.')).toBe(0);
  });

  it('strips invalid characters', function() {
    expect(parsers.parseNumber('9ab')).toBe(9);
    expect(parsers.parseNumber('0x12')).toBe(12);
    expect(parsers.parseNumber('$12.12')).toBe(12.12);
    expect(parsers.parseNumber('1_234')).toBe(1234);
  });
});
