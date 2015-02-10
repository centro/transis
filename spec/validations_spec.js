import "es6-shim";
import Model from "../model";

describe('Model validations', function() {
  describe('.validatesPresence', function() {
    var Foo = Model.extend('ValidatesPresenceFoo');
    var Bar = Model.extend('ValidatesPresenceBar');

    var ValidatesPresenceModel = Model.extend('ValidatesPresenceModel', function() {
      this.attr('str', 'string');
      this.attr('num', 'number');
      this.attr('conditionalNum', 'number');
      this.hasOne('foo', Foo);
      this.hasMany('bars', Bar);
      this.validatesPresence('str', 'num', 'foo', 'bars');
      this.validatesPresence('conditionalNum', {
        if: function() { return this.num && this.num % 2 === 0; }
      });
    });

    beforeEach(function() {
      this.m = new ValidatesPresenceModel;
    });

    it('adds a validation error if the attribute is not set', function() {
      expect(this.m.validateProp('str')).toBe(false);
      expect(this.m.errors.str).toEqual(['must be present']);
      this.m.str = 'abc';
      expect(this.m.validateProp('str')).toBe(true);
      expect(this.m.errors.str).toBeUndefined();
    });

    it('does not add a validation error when a value is set by coerced to null', function() {
      this.m.num = 'blah';
      expect(this.m.validateProp('num')).toBe(true);
    });

    it('works properly with hasOne associations', function() {
      expect(this.m.validateProp('foo')).toBe(false);
      expect(this.m.errors.foo).toEqual(['must be present']);
      this.m.foo = new Foo;
      expect(this.m.validateProp('foo')).toBe(true);
      expect(this.m.errors.foo).toBeUndefined();
    });

    it('works properly with hasMany associations', function() {
      expect(this.m.validateProp('bars')).toBe(false);
      expect(this.m.errors.bars).toEqual(['must be present']);
      this.m.bars.push(new Bar);
      expect(this.m.validateProp('bars')).toBe(true);
      expect(this.m.errors.bars).toBeUndefined();
    });

    describe('with the if option', function() {
      it('does not add a validation error when the if function returns false', function() {
        this.m.num = 1;
        this.m.conditionalNum = null;
        expect(this.m.validateProp('conditionalNum')).toBe(true);
        expect(this.m.errors.conditionalNum).toBeUndefined();
      });

      it('does not add a validation error when the if function returns true and the attribute is set', function() {
        this.m.num = 2;
        this.m.conditionalNum = 9;
        expect(this.m.validateProp('conditionalNum')).toBe(true);
        expect(this.m.errors.conditionalNum).toBeUndefined();
      });

      it('adds a validation error when the if function returns true and the attribute is not set', function() {
        this.m.num = 2;
        this.conditionalNum = null;
        expect(this.m.validateProp('conditionalNum')).toBe(false);
        expect(this.m.errors.conditionalNum).toEqual(['must be present']);
      });
    });
  });
});
