"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

require("es6-shim");

var BasisObject = _interopRequire(require("../object"));

var ReactMixin = _interopRequire(require("../react_mixin"));

describe("ReactMixin", function () {
  var Model = BasisObject.extend(function () {
    this.prop("foo");
    this.prop("bar");
    this.prop("baz");
  });

  beforeEach(function () {
    this.model = new Model();
    this.component = Object.assign({
      props: {
        model: this.model
      },
      displayProps: {
        model: ["foo", "bar"] },
      forceUpdate: jasmine.createSpy("forceUpdate"),
      isMounted: jasmine.createSpy("forceUpdate").and.returnValue(true)
    }, ReactMixin);
  });

  describe("componentWillMount", function () {
    beforeEach(function () {
      this.component.componentWillMount();
    });

    it("attaches observers according to the displayProps property that invoke forceUpdate on change", function () {
      this.model.foo = 1;
      BasisObject.flush();
      expect(this.component.forceUpdate).toHaveBeenCalled();

      this.component.forceUpdate.calls.reset();
      this.model.bar = 2;
      BasisObject.flush();
      expect(this.component.forceUpdate).toHaveBeenCalled();

      this.component.forceUpdate.calls.reset();
      this.model.baz = 3;
      BasisObject.flush();
      expect(this.component.forceUpdate).not.toHaveBeenCalled();
    });
  });

  describe("componentWillUnmount", function () {
    beforeEach(function () {
      this.component.componentWillMount();
    });

    it("detaches the observers according to the displayProps", function () {
      this.model.foo = 1;
      BasisObject.flush();
      expect(this.component.forceUpdate).toHaveBeenCalled();
      this.component.forceUpdate.calls.reset();

      this.component.componentWillUnmount();
      this.model.foo = 2;
      BasisObject.flush();
      expect(this.component.forceUpdate).not.toHaveBeenCalled();
    });
  });

  describe("componentWillReceiveProps", function () {
    beforeEach(function () {
      this.component.componentWillMount();
      this.newModel = new Model();
    });

    it("detaches observers from displayProps that are old", function () {
      this.model.foo = 1;
      BasisObject.flush();
      expect(this.component.forceUpdate).toHaveBeenCalled();
      this.component.forceUpdate.calls.reset();

      this.component.componentWillReceiveProps({ model: this.newModel });

      this.model.foo = 2;
      BasisObject.flush();
      expect(this.component.forceUpdate).not.toHaveBeenCalled();
    });

    it("attaches observers to displayProps that are new", function () {
      this.component.componentWillReceiveProps({ model: this.newModel });

      this.newModel.foo = 2;
      BasisObject.flush();
      expect(this.component.forceUpdate).toHaveBeenCalled();
    });
  });
});
