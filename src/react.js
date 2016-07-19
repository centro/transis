import TransisObject from "./object";
import TransisArray from "./array";
import {getPath} from "./util";

let nextId = 1;
let updateLog = {};
let updateQueue = {};

function componentCmp(a, b) {
  if (a._transisId < b._transisId) { return -1; }
  else if (a._transisId > b._transisId) { return 1; }
  else { return 0; }
}

function preFlush() {
  updateLog = {};
  updateQueue = {};
  TransisObject.delay(postFlush);
}

function postFlush() {
  let components = [];

  for (let id in updateQueue) {
    components.push(updateQueue[id]);
  }

  // Sort the components by their assigned _transisId. Since components get mounted from the top
  // down, this should ensure that parent components are force updated before any descendent
  // components that also need an update. This avoids the case where we force update a component
  // and then force update one of its ancestors, which may unnecessarily render the component
  // again.
  components.sort(componentCmp).forEach(function(component) {
    if (!updateLog[component._transisId] && component.isMounted()) {
      component.forceUpdate();
    }
  });

  TransisObject.delayPreFlush(preFlush);
}

function queueUpdate(component) {
  updateQueue[component._transisId] = component;
}

function logUpdate(component) {
  updateLog[component._transisId] = true;
}

TransisObject.delayPreFlush(preFlush);

export var PropsMixin = function(props) {
  return {
    componentWillMount: function() {
      this._transisId = this._transisId || nextId++;
      this._transisQueueUpdate = this._transisQueueUpdate || (() => { queueUpdate(this); });

      for (let k in props) {
        props[k].forEach(function(prop) {
          if (this.props[k]) { this.props[k].on(prop, this._transisQueueUpdate); }
        }, this);
      }
    },

    componentDidMount: function() {
      logUpdate(this);
    },

    componentDidUpdate: function() {
      logUpdate(this);
    },

    componentWillUnmount: function() {
      for (let k in props) {
        props[k].forEach(function(prop) {
          if (this.props[k]) { this.props[k].off(prop, this._transisQueueUpdate); }
        }, this);
      }
    },

    componentWillReceiveProps: function(nextProps) {
      for (let k in props) {
        props[k].forEach(function(prop) {
          if (nextProps[k] !== this.props[k]) {
            if (this.props[k]) { this.props[k].off(prop, this._transisQueueUpdate);  }
            if (nextProps[k]) { nextProps[k].on(prop, this._transisQueueUpdate); }
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
      this._transisId = this._transisId || nextId++;
      this._transisQueueUpdate = this._transisQueueUpdate || (() => { queueUpdate(this); });

      this._transisSyncState = () => {
        var state = {};

        for (let k in props) {
          if (this.state[k] !== object[k]) {
            if (this.state[k] && typeof this.state[k].off === 'function') {
              props[k].forEach((path) => { this.state[k].off(path, this._transisQueueUpdate); });
            }

            if (object[k] && typeof object[k].on === 'function') {
              props[k].forEach((path) => { object[k].on(path, this._transisQueueUpdate); });
            }

            state[k] = object[k];
          }
        }

        if (Object.keys(state).length) { this.setState(state); }
      };

      for (let k in props) {
        if (object[k] && typeof object[k].on === 'function') {
          props[k].forEach((path) => { object[k].on(path, this._transisQueueUpdate); });
        }
      }

      object.on('*', this._transisSyncState);
    },

    componentDidMount: function() {
      logUpdate(this);
    },

    componentDidUpdate: function() {
      logUpdate(this);
    },

    componentWillUnmount: function() {
      for (let k in props) {
        if (this.state[k] && typeof this.state[k].off === 'function') {
          props[k].forEach((path) => { this.state[k].off(path, this._transisQueueUpdate); });
        }
      }

      object.off('*', this._transisSyncState);
    }
  };
};
