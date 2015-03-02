import BasisObject from "./object";
import BasisArray from "./array";
import Model from "./model";
import ReactMixin from "./react_mixin";
import * as util from "./util";
import * as parsers from "./parsers";
import pluralize from "pluralize";

export default Object.assign({
  Object: BasisObject,
  Array: BasisArray,
  A: BasisArray.of,
  Model,
  ReactMixin,
  pluralize
}, util, parsers);
