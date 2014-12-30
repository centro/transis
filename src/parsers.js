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
