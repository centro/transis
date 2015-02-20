import BasisObject from "./object";
import BasisArray from "./array";
import Model from "./model";
import * as util from "./util";
import * as parsers from "./parsers";

export default Object.assign({
  Object: BasisObject,
  Array: BasisArray,
  A: BasisArray.of,
  Model,
}, util, parsers);
