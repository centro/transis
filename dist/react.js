'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _array = require('./array');

var _array2 = _interopRequireDefault(_array);

var PropsMixin = function PropsMixin(props) {
  return {
    componentWillMount: function componentWillMount() {
      var _this = this;

      this._basisFU = this._basisFU || function () {
        _this.isMounted() && _this.forceUpdate();
      };

      var _loop = function (k) {
        props[k].forEach(function (prop) {
          if (this.props[k]) {
            this.props[k].on(prop, this._basisFU);
          }
        }, _this);
      };

      for (var k in props) {
        _loop(k);
      }
    },

    componentWillUnmount: function componentWillUnmount() {
      var _this2 = this;

      var _loop2 = function (k) {
        props[k].forEach(function (prop) {
          if (this.props[k]) {
            this.props[k].off(prop, this._basisFU);
          }
        }, _this2);
      };

      for (var k in props) {
        _loop2(k);
      }
    },

    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
      var _this3 = this;

      var _loop3 = function (k) {
        props[k].forEach(function (prop) {
          if (nextProps[k] !== this.props[k]) {
            if (this.props[k]) {
              this.props[k].off(prop, this._basisFU);
            }
            if (nextProps[k]) {
              nextProps[k].on(prop, this._basisFU);
            }
          }
        }, _this3);
      };

      for (var k in props) {
        _loop3(k);
      }
    }
  };
};

exports.PropsMixin = PropsMixin;
var StateMixin = function StateMixin(object, props) {
  if (typeof props !== 'object') {
    props = _array2['default'].from(arguments).slice(1).reduce(function (acc, prop) {
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
      var _this4 = this;

      this._basisFU = this._basisFU || function () {
        _this4.isMounted() && _this4.forceUpdate();
      };

      this._basisSyncState = function () {
        var state = {};

        var _loop4 = function (k) {
          if (_this4.state[k] !== object[k]) {
            if (_this4.state[k] && typeof _this4.state[k].off === 'function') {
              props[k].forEach(function (path) {
                _this4.state[k].off(path, _this4._basisFU);
              });
            }

            if (object[k] && typeof object[k].on === 'function') {
              props[k].forEach(function (path) {
                object[k].on(path, _this4._basisFU);
              });
            }

            state[k] = object[k];
          }
        };

        for (var k in props) {
          _loop4(k);
        }

        if (Object.keys(state).length) {
          _this4.setState(state);
        }
      };

      var _loop5 = function (k) {
        if (object[k] && typeof object[k].on === 'function') {
          props[k].forEach(function (path) {
            object[k].on(path, _this4._basisFU);
          });
        }
      };

      for (var k in props) {
        _loop5(k);
      }

      object.on('*', this._basisSyncState);
    },

    componentWillUnmount: function componentWillUnmount() {
      var _this5 = this;

      var _loop6 = function (k) {
        if (_this5.state[k] && typeof _this5.state[k].off === 'function') {
          props[k].forEach(function (path) {
            _this5.state[k].off(path, _this5._basisFU);
          });
        }
      };

      for (var k in props) {
        _loop6(k);
      }

      object.off('*', this._basisSyncState);
    }
  };
};
exports.StateMixin = StateMixin;
