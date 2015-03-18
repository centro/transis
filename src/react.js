import BasisArray from "./array";

export var PropsMixin = function(props) {
  return {
    componentWillMount: function() {
      this._basisFU = this._basisFU || () => { this.isMounted() && this.forceUpdate(); };

      for (let k in props) {
        props[k].forEach(function(prop) {
          if (this.props[k]) { this.props[k].on(prop, this._basisFU); }
        }, this);
      }
    },

    componentWillUnmount: function() {
      for (let k in props) {
        props[k].forEach(function(prop) {
          if (this.props[k]) { this.props[k].off(prop, this._basisFU); }
        }, this);
      }
    },

    componentWillReceiveProps: function(nextProps) {
      for (let k in props) {
        props[k].forEach(function(prop) {
          if (nextProps[k] !== this.props[k]) {
            if (this.props[k]) { this.props[k].off(prop, this._basisFU);  }
            if (nextProps[k]) { nextProps[k].on(prop, this._basisFU); }
          }
        }, this);
      }
    }
  };
};

export var StateMixin = function(object, props) {
  if (typeof props !== 'object') {
    props = BasisArray.from(arguments).slice(1).reduce(function(acc, prop) {
      acc[prop] = [];
      return acc;
    }, {});
  }

  return {
    componentWillMount: function() {
      this._basisFU = this._basisFU || () => { this.isMounted() && this.forceUpdate(); };

      this._basisSyncState = () => {
        var state = {};

        for (let k in props) {
          if (this.state[k] !== object[k]) {
            if (this.state[k] && typeof this.state[k].off === 'function') {
              props[k].forEach((path) => { this.state[k].off(path, this._basisFU); });
            }

            if (object[k] && typeof object[k].on === 'function') {
              props[k].forEach((path) => { object[k].on(path, this._basisFU); });
            }

            state[k] = object[k];
          }
        }

        if (Object.keys(state).length) { this.setState(state); }
      };

      this._basisSyncState();

      for (let k in props) {
        if (object[k] && typeof object[k].on === 'function') {
          props[k].forEach((path) => { object[k].on(path, this._basisFU); });
        }
      }

      object.on('*', this._basisSyncState);
    },

    componentWillUnmount: function() {
      for (let k in props) {
        if (this.state[k] && typeof this.state[k].off === 'function') {
          props[k].forEach((path) => { this.state[k].off(path, this._basisFU); });
        }
      }

      object.off('*', this._basisSyncState);
    }
  };
};
