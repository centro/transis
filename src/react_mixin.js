export default {
  componentWillMount: function() {
    if (!this.displayProps) { return; }

    this._forceUpdate = function() {
      if (this.isMounted()) {
        this.forceUpdate();
      }
    }.bind(this);

    for (let k in this.displayProps) {
      this.displayProps[k].forEach(function(prop) {
        if (this.props[k]) { this.props[k].on(prop, this._forceUpdate); }
      }, this);
    }
  },

  componentWillUnmount: function() {
    if (!this.displayProps) { return; }

    for (let k in this.displayProps) {
      this.displayProps[k].forEach(function(prop) {
        if (this.props[k]) { this.props[k].off(prop, this._forceUpdate); }
      }, this);
    }

    delete this._forceUpdate;
  },

  componentWillReceiveProps: function(nextProps) {
    if (!this.displayProps) { return; }

    for (let k in this.displayProps) {
      this.displayProps[k].forEach(function(prop) {
        if (nextProps[k] !== this.props[k]) {
          if (this.props[k]) { this.props[k].off(prop, this._forceUpdate);  }
          if (nextProps[k]) { nextProps[k].on(prop, this._forceUpdate); }
        }
      }, this);
    }
  }
};
