const NUMBER_RE = /^[-]?([0-9]*[0-9][0-9]*(\.[0-9]+)?|[0]*\.[0-9]*[0-9][0-9]*)$/;

// Public: Parses a string containing a number.
//
// s - The string to parse.
//
// Returns a number or `null` if parsing fails.
export function parseNumber(s) {
  s = String(s).replace(/[^\d-.]/g, '').replace(/\.$/, '');
  if (!s.match(NUMBER_RE)) { return null; }
  return parseFloat(s, 10);
}

const MDY_DATE_RE     = /^\s*(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\s*$/;
const ISO8601_DATE_RE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;

// Public: Parses a string containing a percent.
//
// s - The string to parse.
//
// Returns a number or `null` if parsing fails.
export function parsePercent(s) {
  var n = parseNumber(String(s).replace('%', ''));
  return n == null ? null : n / 100;
}

// Public: Parses a string containing a date in the following formats:
//   - YYYY-MM-DD (ISO8601)
//   - MM/DD
//   - MM/DD/YY
//   - MM/DD/YYYY
//
// s - The string to parse.
//
// Returns a `Date` or `null` if parsing fails.
export function parseDate(s) {
  var m, d, y, date, parts;

  s = String(s).replace(/\s/g, '');

  if (parts = s.match(ISO8601_DATE_RE)) {
    y = parseInt(parts[1], 10);
    m = parseInt(parts[2], 10) - 1;
    d = parseInt(parts[3], 10);
    date = new Date(y, m, d);
    return date.getMonth() === m ? date : null;
  }
  else if (parts = s.match(MDY_DATE_RE)) {
    m = parseInt(parts[1], 10) - 1;
    d = parseInt(parts[2], 10);
    y = parts[3] ? parseInt(parts[3], 10) : (new Date).getFullYear();
    if (0 <= y && y <= 68) { y += 2000; }
    if (69 <= y && y <= 99) { y += 1900; }
    date = new Date(y, m, d);
    return date.getMonth() === m ? date : null;
  }
  else {
    return null;
  }
}

const NO_TZ_RE = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?$/;

// Public: Parses a string containing an ISO8601 formatted date and time.
//
// s - The string to parse.
//
// Returns a `Date` or `null` if parsing fails.
export function parseDateTime(s) {
  var n;
  s = String(s);
  if (s.match(NO_TZ_RE)) { s += 'Z'; }
  return (n = Date.parse(s)) ? new Date(n) : null;
}

const EMAIL_FORMAT = /^([^@\s]+)@([-a-z0-9]+\.+[a-z]{2,})$/i;

// Public: Parses a string containing an email.
//
// s - The string to parse.
//
// Returns the email string.
export function parseEmail(s) {
  s = String(s);
  return EMAIL_FORMAT.test(s) ? s : null;
}

const PHONE_FORMAT = /^\d{10}$/;
const PHONE_CHARS  = /[\(\)\s-]/g;

// Public: Parses a string containing an phone number.
//
// s - The string to parse.
//
// Returns the phone string.
export function parsePhone(s) {
  s = String(s);
  return PHONE_FORMAT.test(s.replace(PHONE_CHARS, '')) ? s : null;
}

const DURATION_RE = /^\s*(?:(?::?\d+)|(?::?\d+:\d+)|(?:\d+:\d+:\d+))\s*$/;

// Public: Parses a string containing a time duration. The format is: "HH:MM:SS" where hours and
// minutes are optional.
//
// s - The string to parse.
//
// Returns the number of seconds or `null` if parsing fails.
export function parseDuration(s) {
  s = String(s);

  if (!DURATION_RE.test(s)) { return null; }

  var parts = s.split(':').map(function(p) { return +p; });

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  else {
    return parts[0];
  }
}
