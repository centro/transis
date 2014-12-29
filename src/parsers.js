const NUMBER_RE = /^[-]?([0-9]*[0-9][0-9]*(\.[0-9]+)?|[0]*\.[0-9]*[0-9][0-9]*)$/;

export function parseNumber(s) {
  s = String(s).replace(/[^\d-.]/g, '').replace(/\.$/, '');
  if (!s.match(NUMBER_RE)) { return null; }
  return parseFloat(s, 10);
}
