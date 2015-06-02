"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

require("es6-shim");

var _id_map = require("../id_map");

var _id_map2 = _interopRequireDefault(_id_map);

describe("IdMap", function () {
  function Foo(id) {
    this.id = id;
  }
  function Bar(id) {
    this.id = id;
  }

  beforeEach(function () {
    this.foo1 = new Foo(1);
    this.foo2 = new Foo(2);
    this.bar1 = new Bar(1);
  });

  afterEach(function () {
    _id_map2["default"].clear();
  });

  describe(".insert", function () {
    describe("with a model instance of a class it has seen for the first time", function () {
      it("adds an entry to the models map with the class as the key and a Map as the value", function () {
        expect(_id_map2["default"].models.get(Foo)).toBeUndefined();
        _id_map2["default"].insert(this.foo1);
        expect(_id_map2["default"].models.get(Foo)).not.toBeUndefined();
        expect(_id_map2["default"].models.get(Foo) instanceof Map).toBe(true);
      });

      it("adds the instance to the nested map with the instance's id as the key", function () {
        _id_map2["default"].insert(this.foo2);
        expect(_id_map2["default"].models.get(Foo).get(2)).toBe(this.foo2);
      });
    });

    describe("with a model instance of a class it has seen before", function () {
      beforeEach(function () {
        _id_map2["default"].insert(this.foo1);
      });

      it("adds the model to the map at the key of the given model's constructor", function () {
        expect(_id_map2["default"].models.size).toBe(1);
        expect(_id_map2["default"].models.get(Foo).size).toBe(1);
        _id_map2["default"].insert(this.foo2);
        expect(_id_map2["default"].models.size).toBe(1);
        expect(_id_map2["default"].models.get(Foo).size).toBe(2);
      });

      it("throws an exception when the model already exists in the id map", function () {
        var _this = this;

        expect(function () {
          _id_map2["default"].insert(_this.foo1);
        }).toThrow(new Error("IdMap.insert: model of type `" + Foo + "` and id `1` has already been inserted"));
      });
    });

    it("returns the receiver", function () {
      expect(_id_map2["default"].insert(this.bar1)).toBe(_id_map2["default"]);
    });
  });

  describe(".get", function () {
    beforeEach(function () {
      _id_map2["default"].insert(this.foo1);
      _id_map2["default"].insert(this.foo2);
      _id_map2["default"].insert(this.bar1);
    });

    it("returns the model of the given class and id", function () {
      expect(_id_map2["default"].get(Foo, 1)).toBe(this.foo1);
      expect(_id_map2["default"].get(Foo, 2)).toBe(this.foo2);
      expect(_id_map2["default"].get(Bar, 1)).toBe(this.bar1);
    });

    it("returns undefined when the model does not exist in the id map", function () {
      expect(_id_map2["default"].get(Bar, 9)).toBeUndefined();
      expect(_id_map2["default"].get(function () {}, 3)).toBeUndefined();
    });
  });

  describe(".delete", function () {
    beforeEach(function () {
      _id_map2["default"].insert(this.foo1);
      _id_map2["default"].insert(this.foo2);
      _id_map2["default"].insert(this.bar1);
    });

    it("deletes the given model from the id map", function () {
      expect(_id_map2["default"].get(Foo, 2)).toBe(this.foo2);
      _id_map2["default"]["delete"](this.foo2);
      expect(_id_map2["default"].get(Foo, 2)).toBeUndefined();
    });

    it("returns the receiver", function () {
      expect(_id_map2["default"]["delete"](this.foo2)).toBe(_id_map2["default"]);
      expect(_id_map2["default"]["delete"]({ id: 9 })).toBe(_id_map2["default"]);
    });
  }), describe(".clear", function () {
    it("clears the models map", function () {
      _id_map2["default"].insert(new Foo(1));
      _id_map2["default"].insert(new Foo(2));
      _id_map2["default"].insert(new Bar(10));
      _id_map2["default"].insert(new Bar(20));
      expect(_id_map2["default"].models.size).toBe(2);
      _id_map2["default"].clear();
      expect(_id_map2["default"].models.size).toBe(0);
    });

    it("returns the receiver", function () {
      expect(_id_map2["default"].clear()).toBe(_id_map2["default"]);
    });
  });
});
