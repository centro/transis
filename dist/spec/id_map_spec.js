"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

require("es6-shim");

var IdMap = _interopRequire(require("../id_map"));

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
    IdMap.clear();
  });

  describe(".insert", function () {
    describe("with a model instance of a class it has seen for the first time", function () {
      it("adds an entry to the models map with the class as the key and a Map as the value", function () {
        expect(IdMap.models.get(Foo)).toBeUndefined();
        IdMap.insert(this.foo1);
        expect(IdMap.models.get(Foo)).not.toBeUndefined();
        expect(IdMap.models.get(Foo) instanceof Map).toBe(true);
      });

      it("adds the instance to the nested map with the instance's id as the key", function () {
        IdMap.insert(this.foo2);
        expect(IdMap.models.get(Foo).get(2)).toBe(this.foo2);
      });
    });

    describe("with a model instance of a class it has seen before", function () {
      beforeEach(function () {
        IdMap.insert(this.foo1);
      });

      it("adds the model to the map at the key of the given model's constructor", function () {
        expect(IdMap.models.size).toBe(1);
        expect(IdMap.models.get(Foo).size).toBe(1);
        IdMap.insert(this.foo2);
        expect(IdMap.models.size).toBe(1);
        expect(IdMap.models.get(Foo).size).toBe(2);
      });

      it("throws an exception when the model already exists in the id map", function () {
        var _this = this;

        expect(function () {
          IdMap.insert(_this.foo1);
        }).toThrow(new Error("IdMap.insert: model of type `" + Foo + "` and id `1` has already been inserted"));
      });
    });

    it("returns the receiver", function () {
      expect(IdMap.insert(this.bar1)).toBe(IdMap);
    });
  });

  describe(".get", function () {
    beforeEach(function () {
      IdMap.insert(this.foo1);
      IdMap.insert(this.foo2);
      IdMap.insert(this.bar1);
    });

    it("returns the model of the given class and id", function () {
      expect(IdMap.get(Foo, 1)).toBe(this.foo1);
      expect(IdMap.get(Foo, 2)).toBe(this.foo2);
      expect(IdMap.get(Bar, 1)).toBe(this.bar1);
    });

    it("returns undefined when the model does not exist in the id map", function () {
      expect(IdMap.get(Bar, 9)).toBeUndefined();
      expect(IdMap.get(function () {}, 3)).toBeUndefined();
    });
  });

  describe(".delete", function () {
    beforeEach(function () {
      IdMap.insert(this.foo1);
      IdMap.insert(this.foo2);
      IdMap.insert(this.bar1);
    });

    it("deletes the given model from the id map", function () {
      expect(IdMap.get(Foo, 2)).toBe(this.foo2);
      IdMap["delete"](this.foo2);
      expect(IdMap.get(Foo, 2)).toBeUndefined();
    });

    it("returns the receiver", function () {
      expect(IdMap["delete"](this.foo2)).toBe(IdMap);
      expect(IdMap["delete"]({ id: 9 })).toBe(IdMap);
    });
  }), describe(".clear", function () {
    it("clears the models map", function () {
      IdMap.insert(new Foo(1));
      IdMap.insert(new Foo(2));
      IdMap.insert(new Bar(10));
      IdMap.insert(new Bar(20));
      expect(IdMap.models.size).toBe(2);
      IdMap.clear();
      expect(IdMap.models.size).toBe(0);
    });

    it("returns the receiver", function () {
      expect(IdMap.clear()).toBe(IdMap);
    });
  });
});
