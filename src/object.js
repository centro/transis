import Emitter from "./emitter";

var objectId = 0;

class RynoObject {
  get objectId() { return this.__objectId__ = this.__objectId__ || ++objectId; }
}

Object.assign(RynoObject.prototype, Emitter);

export default RynoObject;
