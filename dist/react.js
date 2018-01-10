"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StateMixin = exports.PropsMixin = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _object = require("./object");

var _object2 = _interopRequireDefault(_object);

var _array = require("./array");

var _array2 = _interopRequireDefault(_array);

var _util = require("./util");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var nextId = 1;
var updateLog = {};
var updateQueue = {};

function componentCmp(a, b) {
  if (a._transisId < b._transisId) {
    return -1;
  } else if (a._transisId > b._transisId) {
    return 1;
  } else {
    return 0;
  }
}

function preFlush() {
  updateLog = {};
  _object2.default.delay(postFlush);
}

function postFlush() {
  var components = [];

  for (var id in updateQueue) {
    components.push(updateQueue[id]);
    delete updateQueue[id];
  }

  // Sort the components by their assigned _transisId. Since components get mounted from the top
  // down, this should ensure that parent components are force updated before any descendent
  // components that also need an update. This avoids the case where we force update a component
  // and then force update one of its ancestors, which may unnecessarily render the component
  // again.
  components.sort(componentCmp).forEach(function (component) {
    if (!updateLog[component._transisId]) {
      component.forceUpdate();
    }
  });

  _object2.default.delayPreFlush(preFlush);
}

function queueUpdate(component) {
  updateQueue[component._transisId] = component;
}

function unqueueUpdate(component) {
  delete updateQueue[component._transisId];
}

function logUpdate(component) {
  updateLog[component._transisId] = true;
}

_object2.default.delayPreFlush(preFlush);

var PropsMixin = exports.PropsMixin = function PropsMixin(props) {
  return {
    componentWillMount: function componentWillMount() {
      var _this = this;

      this._transisId = this._transisId || nextId++;
      this._transisQueueUpdate = this._transisQueueUpdate || function () {
        queueUpdate(_this);
      };

      var _loop = function _loop(k) {
        props[k].forEach(function (prop) {
          if (this.props[k]) {
            this.props[k].on(prop, this._transisQueueUpdate);
          }
        }, _this);
      };

      for (var k in props) {
        _loop(k);
      }
    },

    componentDidMount: function componentDidMount() {
      logUpdate(this);
    },

    componentDidUpdate: function componentDidUpdate() {
      logUpdate(this);
    },

    componentWillUnmount: function componentWillUnmount() {
      var _this2 = this;

      unqueueUpdate(this);

      var _loop2 = function _loop2(k) {
        props[k].forEach(function (prop) {
          if (this.props[k]) {
            this.props[k].off(prop, this._transisQueueUpdate);
          }
        }, _this2);
      };

      for (var k in props) {
        _loop2(k);
      }
    },

    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
      var _this3 = this;

      var _loop3 = function _loop3(k) {
        props[k].forEach(function (prop) {
          if (nextProps[k] !== this.props[k]) {
            if (this.props[k]) {
              this.props[k].off(prop, this._transisQueueUpdate);
            }
            if (nextProps[k]) {
              nextProps[k].on(prop, this._transisQueueUpdate);
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

var StateMixin = exports.StateMixin = function StateMixin(object, props) {
  if ((typeof props === "undefined" ? "undefined" : _typeof(props)) !== 'object') {
    props = _array2.default.from(arguments).slice(1).reduce(function (acc, prop) {
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

      this._transisId = this._transisId || nextId++;
      this._transisQueueUpdate = this._transisQueueUpdate || function () {
        queueUpdate(_this4);
      };

      this._transisSyncState = function () {
        var state = {};

        var _loop4 = function _loop4(k) {
          if (_this4.state[k] !== object[k]) {
            if (_this4.state[k] && typeof _this4.state[k].off === 'function') {
              props[k].forEach(function (path) {
                _this4.state[k].off(path, _this4._transisQueueUpdate);
              });
            }

            if (object[k] && typeof object[k].on === 'function') {
              props[k].forEach(function (path) {
                object[k].on(path, _this4._transisQueueUpdate);
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

      var _loop5 = function _loop5(k) {
        if (object[k] && typeof object[k].on === 'function') {
          props[k].forEach(function (path) {
            object[k].on(path, _this4._transisQueueUpdate);
          });
        }
      };

      for (var k in props) {
        _loop5(k);
      }

      object.on('*', this._transisSyncState);
    },

    componentDidMount: function componentDidMount() {
      logUpdate(this);
    },

    componentDidUpdate: function componentDidUpdate() {
      logUpdate(this);
    },

    componentWillUnmount: function componentWillUnmount() {
      var _this5 = this;

      var _loop6 = function _loop6(k) {
        if (_this5.state[k] && typeof _this5.state[k].off === 'function') {
          props[k].forEach(function (path) {
            _this5.state[k].off(path, _this5._transisQueueUpdate);
          });
        }
      };

      for (var k in props) {
        _loop6(k);
      }

      object.off('*', this._transisSyncState);
    }
  };
};
