"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

require("es6-shim");

var _object = require("../object");

var _object2 = _interopRequireDefault(_object);

var _react = require("../react");

var Model = _object2["default"].extend(function () {
  this.prop("foo");
  this.prop("bar");
  this.prop("baz");
});

describe("PropsMixin", function () {
  beforeEach(function () {
    this.model = new Model();
    this.component = Object.assign({
      props: { model: this.model },
      forceUpdate: jasmine.createSpy("forceUpdate"),
      isMounted: jasmine.createSpy("isMounted").and.returnValue(true)
    }, (0, _react.PropsMixin)({ model: ["foo", "bar"] }));
  });

  describe("componentWillMount", function () {
    beforeEach(function () {
      this.component.componentWillMount();
    });

    it("attaches observers according to the displayProps property that invoke forceUpdate on change", function () {
      this.model.foo = 1;
      _object2["default"].flush();
      expect(this.component.forceUpdate).toHaveBeenCalled();

      this.component.forceUpdate.calls.reset();
      this.model.bar = 2;
      _object2["default"].flush();
      expect(this.component.forceUpdate).toHaveBeenCalled();

      this.component.forceUpdate.calls.reset();
      this.model.baz = 3;
      _object2["default"].flush();
      expect(this.component.forceUpdate).not.toHaveBeenCalled();
    });
  });

  describe("componentWillUnmount", function () {
    beforeEach(function () {
      this.component.componentWillMount();
    });

    it("detaches the observers according to the displayProps", function () {
      this.model.foo = 1;
      _object2["default"].flush();
      expect(this.component.forceUpdate).toHaveBeenCalled();
      this.component.forceUpdate.calls.reset();

      this.component.componentWillUnmount();
      this.model.foo = 2;
      _object2["default"].flush();
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
      _object2["default"].flush();
      expect(this.component.forceUpdate).toHaveBeenCalled();
      this.component.forceUpdate.calls.reset();

      this.component.componentWillReceiveProps({ model: this.newModel });

      this.model.foo = 2;
      _object2["default"].flush();
      expect(this.component.forceUpdate).not.toHaveBeenCalled();
    });

    it("attaches observers to displayProps that are new", function () {
      this.component.componentWillReceiveProps({ model: this.newModel });

      this.newModel.foo = 2;
      _object2["default"].flush();
      expect(this.component.forceUpdate).toHaveBeenCalled();
    });
  });
});

describe("StateMixin", function () {
  var AppState = _object2["default"].extend(function () {
    this.prop("a");
    this.prop("b");
    this.prop("c");
  });

  beforeEach(function () {
    this.appState = new AppState({ a: 1, b: new Model(), c: 3 });
    this.component = {
      state: {},
      forceUpdate: jasmine.createSpy("forceUpdate"),
      setState: jasmine.createSpy("setState").and.callFake(function (state) {
        Object.assign(this.state, state);
      }),
      isMounted: jasmine.createSpy("isMounted").and.returnValue(true)
    };
  });

  describe("with an object of state object property names mapped to paths", function () {
    beforeEach(function () {
      Object.assign(this.component, (0, _react.StateMixin)(this.appState, { a: [], b: ["foo", "bar"] }));
    });

    describe("getInitialState", function () {
      it("returns the props indicated from the given state object", function () {
        expect(this.component.getInitialState()).toEqual({ a: 1, b: this.appState.b });
      });
    });

    describe("componentWillMount", function () {
      beforeEach(function () {
        Object.assign(this.component.state, this.component.getInitialState());
        this.component.componentWillMount();
        this.component.setState.calls.reset();
        this.component.forceUpdate.calls.reset();
      });

      it("attaches observers to the given properties on the state object and syncs their values to the component's state", function () {
        this.appState.a = 10;
        _object2["default"].flush();
        expect(this.component.setState).toHaveBeenCalledWith({ a: 10 });
      });

      it("attaches property observers to the value of the state properties that triggers a forceUpdate on change", function () {
        this.appState.b.foo = 9;
        _object2["default"].flush();
        expect(this.component.forceUpdate).toHaveBeenCalled();
      });

      it("removes property observers from state property objects when swapped out", function () {
        var b1 = this.appState.b,
            b2 = new Model();

        this.appState.b.foo = 9;
        _object2["default"].flush();
        expect(this.component.forceUpdate).toHaveBeenCalled();
        this.component.forceUpdate.calls.reset();

        this.appState.b = b2;
        _object2["default"].flush();
        expect(this.component.forceUpdate).not.toHaveBeenCalled();

        b1.foo = 10;
        _object2["default"].flush();
        expect(this.component.forceUpdate).not.toHaveBeenCalled();
      });

      it("adds property observers to state property objects that are swapped in", function () {
        var b1 = this.appState.b,
            b2 = new Model();

        this.appState.b.foo = 9;
        _object2["default"].flush();
        expect(this.component.forceUpdate).toHaveBeenCalled();
        this.component.forceUpdate.calls.reset();

        this.appState.b = b2;
        _object2["default"].flush();
        expect(this.component.forceUpdate).not.toHaveBeenCalled();

        b2.foo = 10;
        _object2["default"].flush();
        expect(this.component.forceUpdate).toHaveBeenCalled();
      });
    });

    describe("componentWillUnmount", function () {
      beforeEach(function () {
        Object.assign(this.component.state, this.component.getInitialState());
        this.component.componentWillMount();
        this.component.setState.calls.reset();
        this.component.forceUpdate.calls.reset();
      });

      it("removes the observer from the state object", function () {
        this.component.componentWillUnmount();
        this.appState.a = 2;
        _object2["default"].flush();
        expect(this.component.setState).not.toHaveBeenCalled();
      });

      it("removes property observers from state property objects", function () {
        this.component.componentWillUnmount();
        this.appState.b.foo = new Model();
        _object2["default"].flush();
        expect(this.component.forceUpdate).not.toHaveBeenCalled();
      });
    });
  });

  describe("with a list of state object property names", function () {
    beforeEach(function () {
      Object.assign(this.component, (0, _react.StateMixin)(this.appState, "a", "b"));
    });

    describe("componentWillMount", function () {
      beforeEach(function () {
        Object.assign(this.component.state, this.component.getInitialState());
        this.component.componentWillMount();
        this.component.setState.calls.reset();
        this.component.forceUpdate.calls.reset();
      });

      it("attaches observers to the given properties on the state object and syncs their values to the component's state", function () {
        this.appState.b = 10;
        _object2["default"].flush();
        expect(this.component.setState).toHaveBeenCalledWith({ b: 10 });
      });
    });
  });
});
