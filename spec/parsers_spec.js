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

describe('parsePercent', function() {
  it('returns null when given unparseable strings', function() {
    expect(parsers.parsePercent('foo')).toBeNull();
    expect(parsers.parsePercent('')).toBeNull();
    expect(parsers.parsePercent('.')).toBeNull();
  });

  it('converts the given string to a number', function() {
    expect(parsers.parsePercent('4')).toBe(0.04);
    expect(parsers.parsePercent('4.123')).toBe(0.04123);
    expect(parsers.parsePercent('44')).toBe(0.44);
    expect(parsers.parsePercent('128.23')).toBe(1.2823);
  });

  it('handles strings with a % sign', function() {
      expect(parsers.parsePercent('2.5%')).toBe(0.025)
      expect(parsers.parsePercent('99%')).toBe(0.99)
      expect(parsers.parsePercent('110%')).toBe(1.1)
  });
});

describe('parseDate', function() {
  it('returns null when given an invalid date string', function() {
    expect(parsers.parseDate('foo')).toBeNull();
    expect(parsers.parseDate('2/4/5/6')).toBeNull();
    expect(parsers.parseDate('1512')).toBeNull();
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
    expect(parsers.parseDate('092511')).toEqual(new Date(2011, 8, 25));
    expect(parsers.parseDate('09252011')).toEqual(new Date(2011, 8, 25));
    expect(parsers.parseDate('040190')).toEqual(new Date(1990, 3, 1));
    expect(parsers.parseDate('04011990')).toEqual(new Date(1990, 3, 1));
    expect(parsers.parseDate('5.3.13')).toEqual(new Date(2013, 4, 3));
    expect(parsers.parseDate('05+03+13')).toEqual(new Date(2013, 4, 3));
    expect(parsers.parseDate('05+03!13')).toEqual(new Date(2013, 4, 3));
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

describe('parseDuration', function() {
  it('returns null when given a string that that does not match the duration format', function() {
    expect(parsers.parseDuration('foo')).toBeNull();
    expect(parsers.parseDuration('11:')).toBeNull();
    expect(parsers.parseDuration('11:22:33:44')).toBeNull();
  });

  it('converts seconds only into a number', function() {
    expect(parsers.parseDuration('0')).toBe(0);
    expect(parsers.parseDuration('1')).toBe(1);
    expect(parsers.parseDuration('30')).toBe(30);
    expect(parsers.parseDuration('120')).toBe(120);
    expect(parsers.parseDuration(':30')).toBe(30);
    expect(parsers.parseDuration(':120')).toBe(120);
  });

  it('converts minutes and seconds into the number of seconds', function() {
    expect(parsers.parseDuration('0:0')).toBe(0);
    expect(parsers.parseDuration('00:00')).toBe(0);
    expect(parsers.parseDuration('1:2')).toBe(62);
    expect(parsers.parseDuration('1:2')).toBe(62);
    expect(parsers.parseDuration('01:02')).toBe(62);
    expect(parsers.parseDuration('75:75')).toBe(4575);
    expect(parsers.parseDuration(':3:45')).toBe(225);
  });

  it('converts hours, minutes, and seconds into the number of seconds', function() {
    expect(parsers.parseDuration('0:0:0')).toBe(0);
    expect(parsers.parseDuration('00:00:00')).toBe(0);
    expect(parsers.parseDuration('1:2:3')).toBe(3723);
    expect(parsers.parseDuration('25:75:80')).toBe(94580);
  });
});

describe('parseEmail', function() {
  it('handles valid emails', function() {
    expect(parsers.parseEmail("something@something.com")).toEqual("something@something.com");
    expect(parsers.parseEmail("someone@localhost.localdomain")).toEqual("someone@localhost.localdomain");
    expect(parsers.parseEmail("someone@subdomain.foo.com")).toEqual("someone@subdomain.foo.com");
    expect(parsers.parseEmail("a/b@domain.com")).toEqual("a/b@domain.com");
    expect(parsers.parseEmail("foo+bar@foobar.com")).toEqual("foo+bar@foobar.com");
  });

  it('returns null for invalid emails', function() {
    expect(parsers.parseEmail("foobar")).toBeNull();
    expect(parsers.parseEmail("a")).toBeNull();
    expect(parsers.parseEmail("a@b")).toBeNull();
    expect(parsers.parseEmail("foo.com")).toBeNull();
    expect(parsers.parseEmail("@foo.com")).toBeNull();
    expect(parsers.parseEmail("a b@foo.com")).toBeNull();
    expect(parsers.parseEmail("foo@bar.com.")).toBeNull();
    expect(parsers.parseEmail("foo@bar_com")).toBeNull();
    expect(parsers.parseEmail("foo@b:ar.com")).toBeNull();
  });
});

