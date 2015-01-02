import "6to5/polyfill";
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

describe('parseDate', function() {
  it('returns null when given an invalid date string', function() {
    expect(parsers.parseDate('foo')).toBeNull();
    expect(parsers.parseDate('2/4/5/6')).toBeNull();
    expect(parsers.parseDate('2')).toBeNull();
    expect(parsers.parseDate('')).toBeNull();
  });

  it('returns null when given an impossible date', function() {
    expect(parsers.parseDate('13/1/2014')).toBeNull();
    expect(parsers.parseDate('8/32/2014')).toBeNull();
    expect(parsers.parseDate('13/33/2014')).toBeNull();
    expect(parsers.parseDate('2/29/2014')).toBeNull();
    expect(parsers.parseDate('2014-33-13')).toBeNull();
  });

  it('returns a Date object when given a property formatted date string', function() {
    expect(parsers.parseDate('5/3/13')).toEqual(new Date(2013, 4, 3));
    expect(parsers.parseDate('05/03/13')).toEqual(new Date(2013, 4, 3));
    expect(parsers.parseDate('5-3-13')).toEqual(new Date(2013, 4, 3));
    expect(parsers.parseDate('2013-01-01')).toEqual(new Date(2013, 0, 1));
    expect(parsers.parseDate('2013-05-03')).toEqual(new Date(2013, 4, 3));
    expect(parsers.parseDate('2013-12-25')).toEqual(new Date(2013, 11, 25));
  });

  it('handles valid leap year dates', function() {
    expect(parsers.parseDate('2/29/2016')).toEqual(new Date(2016, 1, 29));
    expect(parsers.parseDate('2016-02-29')).toEqual(new Date(2016, 1, 29));
  });

  it('handles leading and trailing whitespace', function() {
    expect(parsers.parseDate('   2/2/2013')).toEqual(new Date(2013, 1, 2));
    expect(parsers.parseDate('2/2/2013  ')).toEqual(new Date(2013, 1, 2));
    expect(parsers.parseDate('  2/2/2013  ')).toEqual(new Date(2013, 1, 2));
    expect(parsers.parseDate('  2013-02-02  ')).toEqual(new Date(2013, 1, 2));
  });

  it('handles dashes as the delimiter', function() {
    expect(parsers.parseDate('2-2-2013')).toEqual(new Date(2013, 1, 2));
  });

  it('handles 4 digit years', function() {
    expect(parsers.parseDate('2/2/2013')).toEqual(new Date(2013, 1, 2));
    expect(parsers.parseDate('2/2/1998')).toEqual(new Date(1998, 1, 2));
    expect(parsers.parseDate('2/2/1000')).toEqual(new Date(1000, 1, 2));
  });

  it('treats 2 digit years between 0 and 68 as the 21st century', function() {
    expect(parsers.parseDate('10/21/00')).toEqual(new Date(2000, 9, 21));
    expect(parsers.parseDate('10/21/01')).toEqual(new Date(2001, 9, 21));
    expect(parsers.parseDate('10/21/67')).toEqual(new Date(2067, 9, 21));
    expect(parsers.parseDate('10/21/68')).toEqual(new Date(2068, 9, 21));
  });

  it('treats 2 digit years between 69 and 99 as the 20th century', function() {
    expect(parsers.parseDate('10/21/69')).toEqual(new Date(1969, 9, 21));
    expect(parsers.parseDate('10/21/70')).toEqual(new Date(1970, 9, 21));
    expect(parsers.parseDate('10/21/98')).toEqual(new Date(1998, 9, 21));
    expect(parsers.parseDate('10/21/99')).toEqual(new Date(1999, 9, 21));
  });

  it('uses the current year when a year is not given', function() {
    var y = (new Date).getFullYear();
    expect(parsers.parseDate('1/1')).toEqual(new Date(y, 0, 1));
    expect(parsers.parseDate('02/02')).toEqual(new Date(y, 1, 2));
    expect(parsers.parseDate('5/19')).toEqual(new Date(y, 4, 19));
  });
});

describe('parseDateTime', function() {
  it('returns null when given a string that cannot be parsed by Date.parse', function() {
    expect(parsers.parseDateTime('asdf')).toBeNull();
  });

  it('returns a Date object when given a valid ISO8601 date string', function() {
    expect(parsers.parseDateTime("2013-03-29T09:49:30Z")).toEqual(new Date(Date.UTC(2013, 2, 29, 9, 49, 30, 0)));
    expect(parsers.parseDateTime("2013-03-29T09:49:30")).toEqual(new Date(Date.UTC(2013, 2, 29, 9, 49, 30, 0)));
    expect(parsers.parseDateTime("2013-03-29T09:49:30.000")).toEqual(new Date(Date.UTC(2013, 2, 29, 9, 49, 30, 0)));
    expect(parsers.parseDateTime("2013-03-29T09:49:30-05:00")).toEqual(new Date(Date.UTC(2013, 2, 29, 9, 49, 30, 0) + (5 * 60 * 60 * 1000)));
    expect(parsers.parseDateTime("2013-03-29T09:49:30-06:00")).toEqual(new Date(Date.UTC(2013, 2, 29, 9, 49, 30, 0) + (6 * 60 * 60 * 1000)));
    expect(parsers.parseDateTime("2013-03-29T09:49:30+02:00")).toEqual(new Date(Date.UTC(2013, 2, 29, 9, 49, 30, 0) - (2 * 60 * 60 * 1000)));
  });
});
