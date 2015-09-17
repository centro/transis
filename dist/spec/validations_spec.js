"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

require("es6-shim");

var _model = require("../model");

var _model2 = _interopRequireDefault(_model);

describe("Model validations", function () {
  describe(".validatesPresence", function () {
    var Foo = _model2["default"].extend("ValidatesPresenceFoo");
    var Bar = _model2["default"].extend("ValidatesPresenceBar");

    var ValidatesPresenceModel = _model2["default"].extend("ValidatesPresenceModel", function () {
      this.attr("str", "string");
      this.attr("num", "number");
      this.attr("conditionalNum", "number");
      this.hasOne("foo", Foo);
      this.hasMany("bars", Bar);
      this.validatesPresence("str", "num", "foo", "bars");
      this.validatesPresence("conditionalNum", {
        "if": function _if() {
          return this.num && this.num % 2 === 0;
        }
      });
    });

    beforeEach(function () {
      this.m = new ValidatesPresenceModel();
    });

    it("adds a validation error if the attribute is not set", function () {
      expect(this.m.validateAttr("str")).toBe(false);
      expect(this.m.ownErrors.str).toEqual(["must be present"]);
      this.m.str = "abc";
      expect(this.m.validateAttr("str")).toBe(true);
      expect(this.m.ownErrors.str).toBeUndefined();
    });

    it("does not add a validation error when a value is set by coerced to null", function () {
      this.m.num = "blah";
      expect(this.m.validateAttr("num")).toBe(true);
    });

    it("works properly with hasOne associations", function () {
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["must be present"]);
      this.m.foo = new Foo();
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("works properly with hasMany associations", function () {
      expect(this.m.validateAttr("bars")).toBe(false);
      expect(this.m.ownErrors.bars).toEqual(["must be present"]);
      this.m.bars.push(new Bar());
      expect(this.m.validateAttr("bars")).toBe(true);
      expect(this.m.ownErrors.bars).toBeUndefined();
    });

    describe("with the if option", function () {
      it("does not add a validation error when the if function returns false", function () {
        this.m.num = 1;
        this.m.conditionalNum = null;
        expect(this.m.validateAttr("conditionalNum")).toBe(true);
        expect(this.m.ownErrors.conditionalNum).toBeUndefined();
      });

      it("does not add a validation error when the if function returns true and the attribute is set", function () {
        this.m.num = 2;
        this.m.conditionalNum = 9;
        expect(this.m.validateAttr("conditionalNum")).toBe(true);
        expect(this.m.ownErrors.conditionalNum).toBeUndefined();
      });

      it("adds a validation error when the if function returns true and the attribute is not set", function () {
        this.m.num = 2;
        this.conditionalNum = null;
        expect(this.m.validateAttr("conditionalNum")).toBe(false);
        expect(this.m.ownErrors.conditionalNum).toEqual(["must be present"]);
      });
    });
  });

  describe(".validatesNumber", function () {
    var ValidatesNumberModel = _model2["default"].extend("ValidatesNumberModel", function () {
      this.attr("foo", "number");
      this.attr("bar", "number");
      this.validatesNumber("foo");
      this.validatesNumber("bar", { nonnegative: true });
      this.validatesNumber("baz", { maximum: 500 });
      this.validatesNumber("quux", { minimum: 12 });
    });

    beforeEach(function () {
      this.m = new ValidatesNumberModel();
    });

    it("adds a validation error if the given value could not be parsed into a number", function () {
      this.m.foo = "abc";
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["is not a number"]);
      this.m.foo = "9";
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("does not add a validation error if the attribute is null", function () {
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("does not add a validation error if the attribute is empty", function () {
      this.m.foo = "";
      expect(this.m.validateAttr("foo")).toBe(true);
    });

    it("ensures the value is non-negative when the nonnegative option is specified", function () {
      this.m.bar = 9;
      expect(this.m.validateAttr("bar")).toBe(true);
      this.m.bar = -1;
      expect(this.m.validateAttr("bar")).toBe(false);
      expect(this.m.ownErrors.bar).toEqual(["must not be negative"]);
    });

    it("ensures the value is less than or equal to the maximum option", function () {
      this.m.baz = 499;
      expect(this.m.validateAttr("baz")).toBe(true);
      this.m.baz = 500;
      expect(this.m.validateAttr("baz")).toBe(true);
      this.m.baz = 500.01;
      expect(this.m.validateAttr("baz")).toBe(false);
      expect(this.m.ownErrors.baz).toEqual(["may not be greater than 500"]);
      this.m.baz = 501;
      expect(this.m.validateAttr("baz")).toBe(false);
      expect(this.m.ownErrors.baz).toEqual(["may not be greater than 500"]);
      this.m.baz = Infinity;
      expect(this.m.validateAttr("baz")).toBe(false);
      expect(this.m.ownErrors.baz).toEqual(["may not be greater than 500"]);
    });

    it("ensures the value is greater than or equal to the minimum option", function () {
      this.m.quux = 13;
      expect(this.m.validateAttr("quux")).toBe(true);
      this.m.quux = 12;
      expect(this.m.validateAttr("quux")).toBe(true);
      this.m.quux = 11;
      expect(this.m.validateAttr("quux")).toBe(false);
      expect(this.m.ownErrors.quux).toEqual(["may not be less than 12"]);
      this.m.quux = -100;
      expect(this.m.validateAttr("quux")).toBe(false);
      expect(this.m.ownErrors.quux).toEqual(["may not be less than 12"]);
      this.m.quux = -Infinity;
      expect(this.m.validateAttr("quux")).toBe(false);
      expect(this.m.ownErrors.quux).toEqual(["may not be less than 12"]);
    });
  });

  describe(".validatesDate", function () {
    var ValidatesDateModel = _model2["default"].extend("ValidatesDateModel", function () {
      this.attr("foo", "date");
      this.validatesDate("foo");
    });

    beforeEach(function () {
      this.m = new ValidatesDateModel();
    });

    it("adds a validation error if the given value could not be parsed into a date", function () {
      this.m.foo = "abc";
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["is not a date"]);
      this.m.foo = "2014-10-27";
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("does not add a validation error if the attribute is null", function () {
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("does not add a validation error if the attribute is empty", function () {
      this.m.foo = "";
      expect(this.m.validateAttr("foo")).toBe(true);
    });
  });

  describe(".validatesEmail", function () {
    var ValidatesEmailModel = _model2["default"].extend("ValidatesEmailModel", function () {
      this.attr("foo", "string");
      this.validatesEmail("foo");
    });

    beforeEach(function () {
      this.m = new ValidatesEmailModel();
    });

    it("adds a validation error when the attribute was not a email", function () {
      this.m.foo = "abc";
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["is not an email"]);

      this.m.foo = "abc@def";
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["is not an email"]);

      this.m.foo = "abc.yolo";
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["is not an email"]);

      this.m.foo = 5;
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["is not an email"]);

      this.m.foo = "abc@def.com";
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("does not add a validation error when the attribute is null", function () {
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("does not add a validation error when the attribute is empty", function () {
      this.m.foo = "";
      expect(this.m.validateAttr("foo")).toBe(true);
    });
  });

  describe(".validatesPhone", function () {
    var ValidatesPhoneModel = _model2["default"].extend("ValidatesPhoneModel", function () {
      this.attr("foo", "string");
      this.validatesPhone("foo");
    });

    beforeEach(function () {
      this.m = new ValidatesPhoneModel();
    });

    it("adds a validation error when the attribute is not a valid phone number", function () {
      this.m.foo = "(5557) 555-5555";
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["is not a phone number"]);

      this.m.foo = "12345678901";
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["is not a phone number"]);

      this.m.foo = 12345678901;
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["is not a phone number"]);
    });

    it("does not add a validation error when the attribute is set to a valid phone number", function () {
      this.m.foo = "(555) 555-5555";
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();

      this.m.foo = "1234567890";
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();

      this.m.foo = 1234567890;
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("does not add a validation error when the attribute is null", function () {
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("does not add a validation error when the attribute is empty", function () {
      this.m.foo = "";
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });
  });

  describe(".validatesDuration", function () {
    var ValidatesDurationModel = _model2["default"].extend("ValidatesDurationModel", function () {
      this.attr("foo", "string");
      this.validatesDuration("foo");
    });

    beforeEach(function () {
      this.m = new ValidatesDurationModel();
    });

    it("adds a validation error if the given value could not be parsed into a duration", function () {
      this.m.foo = "abc";
      expect(this.m.validateAttr("foo")).toBe(false);
      expect(this.m.ownErrors.foo).toEqual(["is not a duration"]);
      this.m.foo = "1:05";
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("does not add a validation error if the attribute is null", function () {
      expect(this.m.validateAttr("foo")).toBe(true);
      expect(this.m.ownErrors.foo).toBeUndefined();
    });

    it("does not add a validation error if the attribute is empty", function () {
      this.m.foo = "";
      expect(this.m.validateAttr("foo")).toBe(true);
    });
  });
});
