import TransisArray from "./array";

export var PropsMixin = function(props) {
  return {
    componentWillMount: function() {
      this._transisFU = this._transisFU || (() => { this.isMounted() && this.forceUpdate(); });

      for (let k in props) {
        props[k].forEach(function(prop) {
          if (this.props[k]) { this.props[k].on(prop, this._transisFU); }
        }, this);
      }
    },

    componentWillUnmount: function() {
      for (let k in props) {
        props[k].forEach(function(prop) {
          if (this.props[k]) { this.props[k].off(prop, this._transisFU); }
        }, this);
      }
    },

    componentWillReceiveProps: function(nextProps) {
      for (let k in props) {
        props[k].forEach(function(prop) {
          if (nextProps[k] !== this.props[k]) {
            if (this.props[k]) { this.props[k].off(prop, this._transisFU);  }
            if (nextProps[k]) { nextProps[k].on(prop, this._transisFU); }
          }
        }, this);
      }
    }
  };
};

export var StateMixin = function(object, props) {
  if (typeof props !== 'object') {
    props = TransisArray.from(arguments).slice(1).reduce(function(acc, prop) {
      acc[prop] = [];
      return acc;
    }, {});
  }

  return {
    getInitialState: function() {
      var state = {};
      for (let k in props) { state[k] = object[k]; }
      return state;
    },

    componentWillMount: function() {
      this._transisFU = this._transisFU || (() => { this.isMounted() && this.forceUpdate(); });

      this._transisSyncState = () => {
        var state = {};

        for (let k in props) {
          if (this.state[k] !== object[k]) {
            if (this.state[k] && typeof this.state[k].off === 'function') {
              props[k].forEach((path) => { this.state[k].off(path, this._transisFU); });
            }

            if (object[k] && typeof object[k].on === 'function') {
              props[k].forEach((path) => { object[k].on(path, this._transisFU); });
            }

            state[k] = object[k];
          }
        }

        if (Object.keys(state).length) { this.setState(state); }
      };

      for (let k in props) {
        if (object[k] && typeof object[k].on === 'function') {
          props[k].forEach((path) => { object[k].on(path, this._transisFU); });
        }
      }

      object.on('*', this._transisSyncState);
    },

    componentWillUnmount: function() {
      for (let k in props) {
        if (this.state[k] && typeof this.state[k].off === 'function') {
          props[k].forEach((path) => { this.state[k].off(path, this._transisFU); });
        }
      }

      object.off('*', this._transisSyncState);
    }
  };
};
