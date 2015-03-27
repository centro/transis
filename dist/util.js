"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

// Internal: Used to detect cases of recursion on the same pair of objects. Returns `true` if the
// given objects have already been seen. Otherwise the given function is called and `false` is
// returned.
//
// This function is used internally when traversing objects and arrays to avoid getting stuck in
// infinite loops when circular objects are encountered. It should be wrapped around all recursive
// function calls where a circular object may be encountered. See `Basis.eq` for an example.
//
// o1 - The first object to check for recursion.
// o2 - The paired object to check for recursion (default: `undefined`).
// f  - A function that make the recursive funciton call.
//
// Returns `true` if recursion on the given objects has been detected. If the given pair of objects
//   has yet to be seen, calls `f` and returns `false`.
exports.detectRecursion = detectRecursion;

// Public: Returns a string indicating the type of the given object. This can be considered an
// enhanced version of the javascript `typeof` operator.
//
// Examples
//
//   Basis.type([])       // => 'array'
//   Basis.type({})       // => 'object'
//   Basis.type(9)        // => 'number'
//   Basis.type(/fo*/)    // => 'regexp'
//   Basis.type(new Date) // => 'date'
//
// o - The object to get the type of.
//
// Returns a string indicating the object's type.
exports.type = type;

// Public: Performs an object equality test. If the first argument is a `Basis.Object` then it is
// sent the `eq` method, otherwise custom equality code is run based on the object type.
//
// a - Any object.
// b - Any object.
//
// Returns `true` if the objects are equal and `false` otherwise.
exports.eq = eq;

// Public: Converts the given string to CamelCase.
exports.camelize = camelize;

// Public: Converts the given string to under_score_case.
exports.underscore = underscore;

// Public: Capitalizes the first letter of the given string.
exports.capitalize = capitalize;

var BasisObject = _interopRequire(require("./object"));

var toString = Object.prototype.toString;

var seenObjects = [];

// Internal: Used by `detectRecursion` to check to see if the given pair of objects has been
// encountered yet on a previous recursive call.
//
// o1 - The first object to check for recursion.
// o2 - The paired object to check for recursion.
//
// Returns `true` if the pair has been seen previously and `false` otherwise.
function seen(o1, o2) {
  var i, len;

  for (i = 0, len = seenObjects.length; i < len; i++) {
    if (seenObjects[i][0] === o1 && seenObjects[i][1] === o2) {
      return true;
    }
  }

  return false;
}

// Internal: Used by `detectRecursion` to mark the given pair of objects as seen before recursing.
//
// o1 - The first object to mark.
// o2 - The paired object to mark.
//
// Returns nothing.
function mark(o1, o2) {
  seenObjects.push([o1, o2]);
}

// Internal: Used by `detectRecursion` to unmark the given pair of objects after a recursive call
// has completed.
//
// o1 - The first object to unmark.
// o2 - The paired object to unmark.
//
// Returns nothing.
function unmark(o1, o2) {
  var i, n;

  for (i = 0, n = seenObjects.length; i < n; i++) {
    if (seenObjects[i][0] === o1 && seenObjects[i][1] === o2) {
      seenObjects.splice(i, 1);
      return;
    }
  }
}function detectRecursion(o1, o2, f) {
  if (arguments.length === 2) {
    f = o2;o2 = undefined;
  }

  if (seen(o1, o2)) {
    return true;
  } else {
    mark(o1, o2);
    try {
      f();
    } finally {
      unmark(o1, o2);
    }
    return false;
  }
};function type(o) {
  if (o === null) {
    return "null";
  }
  if (o === undefined) {
    return "undefined";
  }

  switch (toString.call(o)) {
    case "[object Array]":
      return "array";
    case "[object Arguments]":
      return "arguments";
    case "[object Function]":
      return "function";
    case "[object String]":
      return "string";
    case "[object Number]":
      return "number";
    case "[object Boolean]":
      return "boolean";
    case "[object Date]":
      return "date";
    case "[object RegExp]":
      return "regexp";
    case "[object Object]":
      if (o.hasOwnProperty("callee")) {
        return "arguments";
      } // ie fallback
      else {
        return "object";
      }
  }

  return "unknown";
};function eq(a, b) {
  var atype, btype, akeys, bkeys, r;

  // identical objects are equal
  if (a === b) {
    return true;
  }

  // if the first argument is a Basis.Object, delegate to its `eq` method
  if (a instanceof BasisObject) {
    return a.eq(b);
  }

  atype = type(a);
  btype = type(b);

  // native objects that are not of the same type are not equal
  if (atype !== btype) {
    return false;
  }

  switch (atype) {
    case "boolean":
    case "string":
    case "date":
    case "number":
      return a.valueOf() === b.valueOf();
    case "regexp":
      return a.source === b.source && a.global === b.global && a.multiline === b.multiline && a.ignoreCase === b.ignoreCase;
    case "array":
      if (a.length !== b.length) {
        return false;
      }

      r = true;

      detectRecursion(a, b, function () {
        var i, len;

        for (i = 0, len = a.length; i < len; i++) {
          if (!eq(a[i], b[i])) {
            r = false;break;
          }
        }
      });

      return r;
    case "object":
      akeys = Object.keys(a);
      bkeys = Object.keys(b);

      if (akeys.length !== bkeys.length) {
        return false;
      }

      r = true;

      detectRecursion(a, b, function () {
        var i, len, key;

        for (i = 0, len = akeys.length; i < len; i++) {
          key = akeys[i];
          if (!b.hasOwnProperty(key)) {
            r = false;break;
          }
          if (!eq(a[key], b[key])) {
            r = false;break;
          }
        }
      });

      return r;
    default:
      return false;
  }
}function camelize(s) {
  return typeof s === "string" ? s.replace(/(?:[-_])(\w)/g, function (_, c) {
    return c ? c.toUpperCase() : "";
  }) : s;
}function underscore(s) {
  return typeof s === "string" ? s.replace(/([a-z\d])([A-Z]+)/g, "$1_$2").replace(/[-\s]+/g, "_").toLowerCase() : s;
}function capitalize(s) {
  return typeof s === "string" && s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
Object.defineProperty(exports, "__esModule", {
  value: true
});
