var IdMap = {
  models: new Map(),

  insert: function(model) {
    var klass = model.constructor, id = model.id, map;

    if (!(map = this.models.get(klass))) {
      this.models.set(klass, map = new Map());
    }

    if (map.get(id)) {
      throw new Error(`IdMap.insert: model of type \`${klass.name}\` and id \`${id}\` has already been inserted`);
    }

    map.set(id,  model);

    return this;
  },

  get: function(klass, id) {
    var map = this.models.get(klass);
    return map && map.get(id);
  },

  delete: function(model) {
    var map = this.models.get(model.constructor);
    if (!map) { return this; }
    map.delete(model.id);
    return this;
  },

  clear: function() { this.models.clear(); return this; }
};

export default IdMap;
