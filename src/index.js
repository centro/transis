import TransisObject from "./object";
import TransisArray from "./array";
import Model from "./model";
import * as react from "./react";
import * as util from "./util";
import * as parsers from "./parsers";
import pluralize from "pluralize";

export default Object.assign({
  Object: TransisObject,
  Array: TransisArray,
  A: TransisArray.of,
  Model,
  pluralize,
  ReactPropsMixin: react.PropsMixin,
  ReactStateMixin: react.StateMixin
}, util, parsers);
