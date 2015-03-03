"use strict";

module.exports = {
  componentWillMount: function componentWillMount() {
    var _this = this;

    if (!this.displayProps) {
      return;
    }

    this._forceUpdate = (function () {
      this.forceUpdate();
    }).bind(this);

    for (var k in this.displayProps) {
      (function (k) {
        _this.displayProps[k].forEach(function (prop) {
          if (this.props[k]) {
            this.props[k].on(prop, this._forceUpdate);
          }
        }, _this);
      })(k);
    }
  },

  componentWillUnmount: function componentWillUnmount() {
    var _this = this;

    if (!this.displayProps) {
      return;
    }

    for (var k in this.displayProps) {
      (function (k) {
        _this.displayProps[k].forEach(function (prop) {
          if (this.props[k]) {
            this.props[k].off(prop, this._forceUpdate);
          }
        }, _this);
      })(k);
    }

    delete this._forceUpdate;
  },

  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
    var _this = this;

    if (!this.displayProps) {
      return;
    }

    for (var k in this.displayProps) {
      (function (k) {
        _this.displayProps[k].forEach(function (prop) {
          if (nextProps[k] !== this.props[k]) {
            if (this.props[k]) {
              this.props[k].off(prop, this._forceUpdate);
            }
            if (nextProps[k]) {
              nextProps[k].on(prop, this._forceUpdate);
            }
          }
        }, _this);
      })(k);
    }
  }
};
