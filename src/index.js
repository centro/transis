import BasisObject from "./object";
import BasisArray from "./array";
import QueryArray from "./query_array";
import Model from "./model";
import * as util from "./util";

export default Object.assign({
  Object: BasisObject,
  Array: BasisArray,
  A: BasisArray.A,
  Model,
  QueryArray
}, util);
