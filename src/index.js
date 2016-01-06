import TransisObject from "./object";
import TransisArray from "./array";
import Model from "./model";
import IdMap from "./id_map";
import * as react from "./react";
import * as util from "./util";
import * as parsers from "./parsers";
import pluralize from "pluralize";

// Public: Resets Transis by clearing the ID map and clearing out the pending change queue. This
// should only ever be used in specs.
function reset() {
  IdMap.clear();
  TransisObject.clearChangeQueue();
}

export default Object.assign({
  Object: TransisObject,
  Array: TransisArray,
  A: TransisArray.of,
  Model,
  pluralize,
  ReactPropsMixin: react.PropsMixin,
  ReactStateMixin: react.StateMixin,
  reset: reset
}, util, parsers);
