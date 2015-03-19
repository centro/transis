"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var BasisArray = _interopRequire(require("./array"));

var PropsMixin = exports.PropsMixin = function PropsMixin(props) {
  return {
    componentWillMount: function componentWillMount() {
      var _this = this;

      this._basisFU = this._basisFU || function () {
        _this.isMounted() && _this.forceUpdate();
      };

      for (var k in props) {
        (function (k) {
          props[k].forEach(function (prop) {
            if (this.props[k]) {
              this.props[k].on(prop, this._basisFU);
            }
          }, _this);
        })(k);
      }
    },

    componentWillUnmount: function componentWillUnmount() {
      var _this = this;

      for (var k in props) {
        (function (k) {
          props[k].forEach(function (prop) {
            if (this.props[k]) {
              this.props[k].off(prop, this._basisFU);
            }
          }, _this);
        })(k);
      }
    },

    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
      var _this = this;

      for (var k in props) {
        (function (k) {
          props[k].forEach(function (prop) {
            if (nextProps[k] !== this.props[k]) {
              if (this.props[k]) {
                this.props[k].off(prop, this._basisFU);
              }
              if (nextProps[k]) {
                nextProps[k].on(prop, this._basisFU);
              }
            }
          }, _this);
        })(k);
      }
    }
  };
};

var StateMixin = exports.StateMixin = function StateMixin(object, props) {
  if (typeof props !== "object") {
    props = BasisArray.from(arguments).slice(1).reduce(function (acc, prop) {
      acc[prop] = [];
      return acc;
    }, {});
  }

  return {
    getInitialState: function getInitialState() {
      var state = {};
      for (var k in props) {
        state[k] = object[k];
      }
      return state;
    },

    componentWillMount: function componentWillMount() {
      var _this = this;

      this._basisFU = this._basisFU || function () {
        _this.isMounted() && _this.forceUpdate();
      };

      this._basisSyncState = function () {
        var state = {};

        for (var k in props) {
          (function (k) {
            if (_this.state[k] !== object[k]) {
              if (_this.state[k] && typeof _this.state[k].off === "function") {
                props[k].forEach(function (path) {
                  _this.state[k].off(path, _this._basisFU);
                });
              }

              if (object[k] && typeof object[k].on === "function") {
                props[k].forEach(function (path) {
                  object[k].on(path, _this._basisFU);
                });
              }

              state[k] = object[k];
            }
          })(k);
        }

        if (Object.keys(state).length) {
          _this.setState(state);
        }
      };

      for (var k in props) {
        (function (k) {
          if (object[k] && typeof object[k].on === "function") {
            props[k].forEach(function (path) {
              object[k].on(path, _this._basisFU);
            });
          }
        })(k);
      }

      object.on("*", this._basisSyncState);
    },

    componentWillUnmount: function componentWillUnmount() {
      var _this = this;

      for (var k in props) {
        (function (k) {
          if (_this.state[k] && typeof _this.state[k].off === "function") {
            props[k].forEach(function (path) {
              _this.state[k].off(path, _this._basisFU);
            });
          }
        })(k);
      }

      object.off("*", this._basisSyncState);
    }
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
