import "es6-shim";
import Model from "../model";
import IdMap from "../id_map";

describe('Model', function () {
  var TestMapper = {
    query: function() {},
    get: function() {},
    create: function() {},
    update: function() {},
    delete: function() {}
  };

  class BasicModel extends Model {}
  BasicModel.attr('str', 'string');
  BasicModel.attr('strWithDefault', 'string', {default: 'zzz'});
  BasicModel.attr('num', 'number');
  Model.registerClass(BasicModel);

  class Author extends Model {}
  Model.registerClass(Author);
  Author.attr('first', 'string');
  Author.attr('last', 'string');
  Author.hasMany('posts', 'Post', {inverse: 'author'});

  class Post extends Model {}
  Model.registerClass(Post);
  Post.attr('title', 'string');
  Post.attr('body', 'string');
  Post.hasOne('author', 'Author', {inverse: 'posts'});
  Post.hasMany('tags', 'Tag', {inverse: 'posts'});

  class Tag extends Model {}
  Model.registerClass(Tag);
  Tag.attr('name', 'string');
  Tag.hasMany('posts', 'Post', {inverse: 'tags'});

  beforeEach(function() {
    BasicModel.mapper = TestMapper;
  });

  afterEach(function() { IdMap.clear(); });

  describe('.registerClass', function() {
    it('throws an exception when given something other than a Model subclass', function() {
      var x = {};

      expect(function() {
        Model.registerClass(x, 'x');
      }).toThrow(new Error(`Ryno.Model.registerClass: \`${x}\` is not a subclass of Ryno.Model`));
    });

    it('throws an exception when given a null name', function() {
      class A extends Model {}

      expect(function() {
        Model.registerClass(A, null);
      }).toThrow(new Error(`Ryno.Model.registerClass: no name given for class: \`${A}\``));
    });

    it('throws an exception when given a name that has already been registered', function() {
      class A1 extends Model {}
      class A2 extends Model {}

      Model.registerClass(A1, 'A');
      expect(function() {
        Model.registerClass(A2, 'A');
      }).toThrow(new Error("Ryno.Model.registerClass: a class with name `A` has already been registered"));
    });
  });

  describe('.empty', function() {
    it('returns an instance of the class with sourceState set to EMPTY and the given id', function() {
      var m = Model.empty(127);
      expect(m.id).toBe(127);
      expect(m.sourceState).toBe(Model.EMPTY);
    });
  });

  describe('.registerAttr', function() {
    it('throws an exception when an attribute with the given name has already been defined', function() {
      expect(function() {
        Model.registerAttr('string');
      }).toThrow(new Error('Ryno.Model.registerAttr: an attribute with the name `string` has already been defined'));
    });
  });

  describe('#id=', function() {
    it('throws an exception when an attempt is made to overwrite an existing non-null value', function() {
      var m = new BasicModel({id: 1});
      expect(m.id).toBe(1);
      expect(function() {
        m.id = 9;
      }).toThrow(new Error(`BasicModel#id=: overwriting a model's identity is not allowed: ${m}`));
    });
  });

  describe('.attr', function() {
    beforeEach(function() {
      this.m = new BasicModel;
    });

    it('throws an exception if given an unregistered attr name', function() {
      expect(function() {
        BasicModel.attr('x', 'foo');
      }).toThrow(new Error('BasicModel.attr: unknown attribute type: `foo`'));
    });

    it('defines a property on the class prototype with the given name', function() {
      expect('str' in BasicModel.prototype).toBe(true);
    });

    it('defines a property that sets its value on the attrs object', function() {
      expect(this.m.attrs.str).toBeUndefined();
      this.m.str = 'abc';
      expect(this.m.attrs.str).toBe('abc');
    });

    it('defines a property that gets its value from the attrs object', function() {
      this.m.attrs.str = 'xyz';
      expect(this.m.str).toBe('xyz');
    });

    it('uses the `default` option as the default value when one has yet to be set', function() {
      expect(this.m.strWithDefault).toBe('zzz');
      this.m.strWithDefault = 'a';
      expect(this.m.strWithDefault).toBe('a');
      this.m.strWithDefault = undefined;
      expect(this.m.strWithDefault).toBe('zzz');
    });

    it("returns undefined as the default value when one isn't specified", function() {
      expect(this.m.str).toBeUndefined();
    });

    it("coerces the given value when setting via the attr's coerce method", function() {
      this.m.num = '9';
      expect(this.m.num).toBe(9);
    });

    it('sets the <name>BeforeCoercion property to the given value when setting', function() {
      this.m.num = '9';
      expect(this.m.num).toBe(9);
      expect(this.m.numBeforeCoercion).toBe('9');
    });
  });

  describe('.hasOne', function() {
    describe('with no inverse', function() {
      class Bar extends Model {}
      class Foo extends Model {}
      Foo.hasOne('bar', Bar);

      it('creates a property with the given name', function() {
        expect('bar' in Foo.prototype).toBe(true);
      });

      it('initializes the property to undefined', function() {
        expect((new Foo).bar).toBeUndefined();
      });

      it('throws an exception when setting an object of the wrong type', function() {
        var f = new Foo, b = new BasicModel;
        expect(function() {
          f.bar = b;
        }).toThrow(new Error(`Foo#bar: expected an object of type \`Bar\` but received \`${b}\` instead`));
      });
    });

    describe('with a hasOne inverse', function() {
      class Bar extends Model {}
      class Foo extends Model {}
      Foo.hasOne('bar', Bar, {inverse: 'foo'});
      Bar.hasOne('foo', Foo, {inverse: 'bar'});

      it('sets the receiver as the inverse when setting', function() {
        var f = new Foo, b = new Bar;

        f.bar = b;
        expect(b.foo).toBe(f);
      });

      it('clears the inverse side when set to null', function() {
        var f = new Foo, b = new Bar;

        f.bar = b;
        expect(f.bar).toBe(b);
        expect(b.foo).toBe(f);
        f.bar = undefined;
        expect(f.bar).toBeUndefined();
        expect(b.foo).toBeUndefined();
      });
    });

    describe('with a hasMany inverse', function() {
      class Foo extends Model {}
      class Bar extends Model {}
      Foo.hasOne('bar', Bar, {inverse: 'foos'});
      Bar.hasMany('foos', Foo, {inverse: 'bar'});

      it('adds the receiver to the inverse array when setting', function() {
        var f1 = new Foo, f2 = new Foo, b = new Bar;

        f1.bar = b;
        expect(b.foos).toEqual([f1]);
        f2.bar = b;
        expect(b.foos).toEqual([f1, f2]);
      });

      it('removes the receiver from the inverse array when clearing', function() {
        var f1 = new Foo, f2 = new Foo, b = new Bar;

        f1.bar = b;
        f2.bar = b;
        expect(b.foos).toEqual([f1, f2]);
        f1.bar = null;
        expect(b.foos).toEqual([f2]);
        f2.bar = null;
        expect(b.foos).toEqual([]);
      });
    });
  });

  describe('.hasMany', function() {
    describe('with no inverse', function() {
      class Foo extends Model {}
      class Bar extends Model {}
      Foo.hasMany('bars', Bar);

      it('creates a property with the given name', function() {
        expect('bars' in Foo.prototype).toBe(true);
      });

      it('generates an "add<Name>" method', function() {
        expect(typeof Foo.prototype.addBars).toBe('function');
      });

      it('generates a "remove<Name>" method', function() {
        expect(typeof Foo.prototype.removeBars).toBe('function');
      });

      it('generates a "clear<Name>" method', function() {
        expect(typeof Foo.prototype.clearBars).toBe('function');
      });

      it('initializes the property to an empty array', function() {
        var f = new Foo;
        expect(f.bars).toEqual([]);
      });

      it('throws an exception when setting models of the wrong type', function() {
        var f = new Foo, b = new BasicModel;

        expect(function() {
          f.bars = [b];
        }).toThrow(new Error(`Foo#bars: expected an object of type \`Bar\` but received \`${b}\` instead`));
      });

      describe('generated add method', function() {
        it('adds the given model to the array', function() {
          var f = new Foo, b1 = new Bar, b2 = new Bar;

          f.addBars(b1, b2);
          expect(f.bars).toEqual([b1, b2]);
        });

        it('throws an exception when adding objects of the wrong type', function() {
          var f = new Foo, b = new BasicModel;

          expect(function() {
            f.addBars(b);
          }).toThrow(new Error(`Foo#bars: expected an object of type \`Bar\` but received \`${b}\` instead`));
        });
      });

      describe('generated remove method', function() {
        it('removes the given model from the array', function() {
          var f = new Foo, b1 = new Bar, b2 = new Bar;

          f.bars = [b1, b2];
          expect(f.bars).toEqual([b1, b2]);
          f.removeBars(b2);
          expect(f.bars).toEqual([b1]);
        });
      });

      describe('generated clear method', function() {
        it('removes all models from the array', function() {
          var f = new Foo, b1 = new Bar, b2 = new Bar;

          f.bars = [b1, b2];
          expect(f.bars).toEqual([b1, b2]);
          f.clearBars(b2);
          expect(f.bars).toEqual([]);
        });
      });
    });

    describe('with a hasOne inverse', function() {
      class Foo extends Model {}
      class Bar extends Model {}
      Foo.hasMany('bars', Bar, {inverse: 'foo'});
      Bar.hasOne('foo', Foo, {inverse: 'bars'});

      it('sets the hasOne side when adding to the hasMany side', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
        f.addBars(b1);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBeUndefined();
        f.addBars(b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
      });

      it('sets the hasOne side when setting the hasMany side', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
        f.bars = [b1, b2];
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
      });

      it('clears the hasOne side when removing from the hasMany side', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.addBars(b1, b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
        f.removeBars(b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBeUndefined();
      });

      it('clears the hasOne side when the hasMany side is cleared', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.addBars(b1, b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
        f.clearBars();
        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
      });

      it('clears the hasOne side when the hasMany side is set to an empty array', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.addBars(b1, b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
        f.bars = [];
        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
      });
    });

    describe('with a hasMany inverse', function() {
      class Foo extends Model {}
      class Bar extends Model {}
      Foo.hasMany('bars', Bar, {inverse: 'foos'});
      Bar.hasMany('foos', Foo, {inverse: 'bars'});

      it('adds the receiver on the inverse side when a model is added', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        expect(f.bars).toEqual([]);
        expect(b1.foos).toEqual([]);
        expect(b2.foos).toEqual([]);
        f.addBars(b1);
        expect(f.bars).toEqual([b1]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([]);
        f.addBars(b2);
        expect(f.bars).toEqual([b1, b2]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([f]);
      });

      it('adds the receiver on the inverse side when the association is set', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.bars = [b1, b2];
        expect(f.bars).toEqual([b1, b2]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([f]);
      });

      it('removes the receiver from the inverse side of the previously associated models when the association is set', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar, b3 = new Bar, b4 = new Bar;

        f.bars = [b1, b2];
        expect(f.bars).toEqual([b1, b2]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([f]);
        f.bars = [b3, b4];
        expect(f.bars).toEqual([b3, b4]);
        expect(b1.foos).toEqual([]);
        expect(b2.foos).toEqual([]);
      });

      it('removes the receiver from the inverse side when a model is removed', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.addBars(b1, b2);
        expect(f.bars).toEqual([b1, b2]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([f]);
        f.removeBars(b2);
        expect(f.bars).toEqual([b1]);
        expect(b1.foos).toEqual([f]);
        expect(b2.foos).toEqual([]);
        b1.removeFoos(f);
        expect(f.bars).toEqual([]);
        expect(b1.foos).toEqual([]);
        expect(b2.foos).toEqual([]);
      });
    });
  });

  describe('.local', function() {
    describe('for an id of a model that is already loaded into the identity map', function() {
      it('returns a reference to the already existing model', function() {
        var m = BasicModel.load({id: 1234, str: 'a', num: 2});
        expect(BasicModel.local(1234)).toBe(m);
      });
    });

    describe('for an id of a model that is not loaded into the identity map', function() {
      it('returns an empty instance of the model', function() {
        var m = BasicModel.local(4567);
        expect(m.sourceState).toBe(Model.EMPTY);
      });

      it("does not invoke the mapper's get method", function() {
        spyOn(BasicModel.mapper, 'get');
        BasicModel.local(1122);
        expect(BasicModel.mapper.get).not.toHaveBeenCalled();
      });
    });
  });

  describe('.load', function() {
    describe('given attributes containing an id not in the identity map', function() {
      it('returns a new model instance with the given attributes', function() {
        var m = BasicModel.load({id: 126, str: 's', num: 1});
        expect(m instanceof BasicModel).toBe(true);
        expect(m.id).toBe(126);
        expect(m.str).toBe('s');
        expect(m.num).toBe(1);
      });

      it('does not set non-attributes properties', function() {
        var m = BasicModel.load({id: 126, str: 's', num: 1, blah: 'boo'});
        expect('blah' in m).toBe(false);
      });

      it('adds the new model instance to the identity map', function() {
        var m = BasicModel.load({id: 127, str: 's', num: 1});
        expect(BasicModel.get(127)).toBe(m);
      });

      it('sets the sourceState to LOADED', function() {
        var m = BasicModel.load({id: 128, str: 's', num: 1});
        expect(m.sourceState).toBe(Model.LOADED);
      });

      it('sets isBusy to false', function() {
        var m = BasicModel.load({id: 128, str: 's', num: 1});
        expect(m.isBusy).toBe(false);
      });
    });

    describe('given attributes containing an id that is in the identity map', function() {
      it('updates and returns the model that is already in the identity map', function() {
        var m1 = BasicModel.load({id: 200, str: 's1', num: 1}),
            m2 = BasicModel.load({id: 200, str: 's2', num: 2});

        expect(m2).toBe(m1);
        expect(m2.str).toBe('s2');
        expect(m2.num).toBe(2);
      });

      it('sets the sourceState to LOADED', function() {
        var m = BasicModel.load({id: 201, str: 's', num: 1});

        m.str = 'x';
        BasicModel.load({id: 201, str: 's3'});
        expect(m.sourceState).toBe(Model.LOADED);
      });

      describe('when the model in the identity map is empty', function() {
        it('does not throw an exception', function() {
          var m = BasicModel.empty(19);

          expect(function() {
            BasicModel.load({id: 19, str: 'x', num: 2});
          }).not.toThrow();

          expect(m.sourceState).toBe(Model.LOADED);
          expect(m.str).toBe('x');
          expect(m.num).toBe(2);
        });
      });
    });

    describe('given attributes that do not include an id', function() {
      it('throws an exception', function() {
        expect(function() {
          BasicModel.load({str: 's'});
        }).toThrow(new Error('BasicModel.load: an `id` attribute is required'));
      });
    });

    describe('given attributes containing a nested hasOne association', function() {
      it('loads the nested model and hooks up the association', function() {
        var p = Post.load({
          id: 184, title: 'the title', body: 'the body',
          author: {id: 9, first: 'Homer', last: 'Simpson'}
        });

        expect(p.author).toBe(Author.get(9));
        expect(p.author.id).toBe(9);
        expect(p.author.first).toBe('Homer');
        expect(p.author.last).toBe('Simpson');
      });
    });

    describe('given attributes containing an id reference to a hasOne association', function() {
      describe('where the id exists in the identity map', function() {
        it('hooks up the association', function() {
          var a = Author.load({id: 11, first: 'Bar', last: 'Simpson'});

          expect(a.posts).toEqual([]);
          var p = Post.load({id: 185, author: 11});
          expect(p.author).toBe(a);
          expect(a.posts).toEqual([p]);
        });
      });

      describe('where the id does not exist in the identity map', function() {
        it('creates an empty instance of the associated object and hooks up the association', function() {
          var p = Post.load({id: 186, author: 12});
          expect(p.author.id).toBe(12);
          expect(p.author.sourceState).toBe(Model.EMPTY);
          expect(p.author.posts).toEqual([p]);
        });
      });

      describe('where the id is indicated by a <name>Id property', function() {
        it('hooks up the association', function() {
          var a = Author.load({id: 13, first: 'Bar', last: 'Simpson'});

          expect(a.posts).toEqual([]);
          var p = Post.load({id: 187, authorId: 13});
          expect(p.author).toBe(a);
          expect(a.posts).toEqual([p]);
        });
      });

      describe('where the id is indicated by a <name>_id property', function() {
        it('hooks up the association', function() {
          var a = Author.load({id: 14, first: 'Bar', last: 'Simpson'});

          expect(a.posts).toEqual([]);
          var p = Post.load({id: 188, author_id: 14});
          expect(p.author).toBe(a);
          expect(a.posts).toEqual([p]);
        });
      });
    });

    describe('given attributes containing a nested hasMany association', function() {
      it('loads all of the nested models and hooks up associations', function() {
        var p = Post.load({
          id: 200, title: 'the title', body: 'the body',
          tags: [{id: 10, name: 'tag a'}, {id: 11, name: 'tag b'}]
        });

        expect(p.tags[0].id).toBe(10);
        expect(p.tags[0].name).toBe('tag a');
        expect(p.tags[0].posts).toEqual([p]);
        expect(p.tags[1].id).toBe(11);
        expect(p.tags[1].name).toBe('tag b');
        expect(p.tags[1].posts).toEqual([p]);
      });

      it('removes existing associations that are not present in the given attributes', function() {
        var t1 = Tag.load({id: 12, name: 'tag a'}),
            t2 = Tag.load({id: 13, name: 'tag b'}),
            p  = Post.load({id: 150, title: 'the  title', body: 'the body', tags: [12, 13]});

        expect(p.tags).toEqual([t1, t2]);
        Post.load({id: 150, title: 'the title', body: 'the body', tags: [13]});
        expect(p.tags).toEqual([t2]);
      });

      it('does not add a model to the hasMany association more than once', function() {
        var p = Post.load({
          id: 151, title: 'the title', body: 'the body',
          tags: [{id: 30, name: 'tag a'}]
        });

        expect(p.tags.map((t) => t.id)).toEqual([30]);

        Post.load({
          id: 151, title: 'the title', body: 'the body',
          tags: [{id: 30, name: 'tag a'}]
        });

        expect(p.tags.map((t) => t.id)).toEqual([30]);
      });
    });

    describe('given attributes containing a list of id references to a hasMany association', function() {
      describe('where the ids exist in the identity map', function() {
        it('hooks up the associations', function() {
          var t1 = Tag.load({id: 40, name: 'blah'}),
              t2 = Tag.load({id: 41, name: 'stuff'});

          expect(t1.posts).toEqual([]);
          expect(t2.posts).toEqual([]);

          var p = Post.load({id: 152, title: 'the title', body: 'the body', tags: [40, 41]});

          expect(t1.posts).toEqual([p]);
          expect(t2.posts).toEqual([p]);
          expect(p.tags).toEqual([t1, t2]);
        });
      });

      describe('where the id does not exist in the identity map', function() {
        it('creates an empty instance of the associated models and hooks up the associations', function() {
          var p = Post.load({id: 153, title: 'the title', body: 'the body', tags: [42, 43]});

          expect(p.tags[0].id).toBe(42);
          expect(p.tags[0].sourceState).toBe(Model.EMPTY);
          expect(p.tags[0].posts).toEqual([p]);
          expect(p.tags[1].id).toBe(43);
          expect(p.tags[1].sourceState).toBe(Model.EMPTY);
          expect(p.tags[1].posts).toEqual([p]);
        });
      });

      describe('where the ids are indicated by a <singular name>Ids property', function() {
        it('hooks up the associations', function() {
          var t1 = Tag.load({id: 44, name: 'blah'}),
              t2 = Tag.load({id: 45, name: 'stuff'});

          expect(t1.posts).toEqual([]);
          expect(t2.posts).toEqual([]);
          var p = Post.load({id: 154, title: 'the title', body: 'the body', tagIds: [44, 45]});
          expect(t1.posts).toEqual([p]);
          expect(t2.posts).toEqual([p]);
          expect(p.tags).toEqual([t1, t2]);
        });
      });

      describe('where the ids are indicated by a <singular name>_ids property', function() {
        it('hooks up the associations', function() {
          var t1 = Tag.load({id: 46, name: 'blah'}),
              t2 = Tag.load({id: 47, name: 'stuff'});

          expect(t1.posts).toEqual([]);
          expect(t2.posts).toEqual([]);
          var p = Post.load({id: 155, title: 'the title', body: 'the body', tag_ids: [46, 47]});
          expect(t1.posts).toEqual([p]);
          expect(t2.posts).toEqual([p]);
          expect(p.tags).toEqual([t1, t2]);
        });
      });
    });

    describe('given attributes containing a mixture of nested models and id references', function() {
      it('creates empty instances for the ids and hooks up all associations', function() {
        var t1 = Tag.load({id: 48, name: 'blah'}),
            p  = Post.load({
              id: 156, title: 'the title', body: 'the body',
              tags: [48, {id: 49, name: 'foo'}, 50]
            });
                            
        expect(p.tags[0].id).toBe(48);
        expect(p.tags[0].sourceState).toBe(Model.LOADED);
        expect(p.tags[0].posts).toEqual([p]);
        expect(p.tags[1].id).toBe(49);
        expect(p.tags[1].sourceState).toBe(Model.LOADED);
        expect(p.tags[1].posts).toEqual([p]);
        expect(p.tags[2].id).toBe(50);
        expect(p.tags[2].sourceState).toBe(Model.EMPTY);
        expect(p.tags[2].posts).toEqual([p]);
        expect(p.tags.map((t) => t.id)).toEqual([48, 49, 50]);
      });
    });
  });

  describe('.loadAll', function() {
    it('loads an array of model objects', function() {
      var as = Author.loadAll([
        {id: 110, first: 'Homer', last: 'Simpson'},
        {id: 111, first: 'Bart', last: 'Simpson'},
        {id: 112, first: 'Ned', last: 'Flanders'}
      ]);

      expect(as.length).toBe(3);
      expect(as[0].id).toBe(110);
      expect(as[0].first).toBe('Homer');
      expect(as[0].last).toBe('Simpson');
      expect(as[1].id).toBe(111);
      expect(as[1].first).toBe('Bart');
      expect(as[1].last).toBe('Simpson');
      expect(as[2].id).toBe(112);
      expect(as[2].first).toBe('Ned');
      expect(as[2].last).toBe('Flanders');
    });
  });

  describe('.query', function() {
    beforeEach(function() {
      spyOn(BasicModel.mapper, 'query').and.returnValue(Promise.resolve({}));
      this.a = BasicModel.query();
    });

    it('returns an empty array', function() {
      expect(this.a).toEqual([]);
    });

    it("invokes the mapper's query method", function() {
      expect(BasicModel.mapper.query).toHaveBeenCalled();
    });
  });

  describe('.buildQuery', function() {
    beforeEach(function() {
      this.a = BasicModel.buildQuery();
    });

    it('returns an empty array', function() {
      expect(this.a).toEqual([]);
    });

    it("does not invoke the mapper's query method", function() {
      spyOn(BasicModel.mapper, 'query');
      BasicModel.buildQuery();
      expect(BasicModel.mapper.query).not.toHaveBeenCalled();
    });

    it('decorates the returned array with a modelClass property', function() {
      expect(this.a.modelClass).toBe(BasicModel);
    });

    it('decorates the returned array with an isBusy property', function() {
      expect(this.a.isBusy).toBe(false);
    });

    it('decorates the returned array with a query method', function() {
      expect(typeof this.a.query).toBe('function');
    });

    it('decorates the returned array with a then method', function() {
      expect(typeof this.a.then).toBe('function');
    });

    it('decorates the returned array with a catch method', function() {
      expect(typeof this.a.catch).toBe('function');
    });
  });

  describe('.query array', function() {
    beforeEach(function() {
      var _this = this;

      BasicModel.mapper = {
        query: function() {
          return new Promise(function(resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
          });
        }
      };

      spyOn(BasicModel.mapper, 'query').and.callThrough();

      this.a = BasicModel.buildQuery();
    });

    describe('#query', function() {
      it('invokes the query method on the data mapper', function() {
        this.a.query();
        expect(BasicModel.mapper.query).toHaveBeenCalledWith({});
      });

      it('forwards the first argument to the data mapper', function() {
        this.a.query({foo: 9, bar: 'baz'});
        expect(BasicModel.mapper.query).toHaveBeenCalledWith({foo: 9, bar: 'baz'});
      });

      it('sets the isBusy property', function() {
        expect(this.a.isBusy).toBe(false);
        this.a.query();
        expect(this.a.isBusy).toBe(true);
      });

      it('sets the isBusy property to false when the promise is resolved', function(done) {
        this.a.query();
        expect(this.a.isBusy).toBe(true);
        this.resolve([]);
        setTimeout(() => {
          expect(this.a.isBusy).toBe(false);
          done();
        });
      });

      it('sets the isBusy property to false when the promise is rejected', function(done) {
        this.a.query();
        expect(this.a.isBusy).toBe(true);
        this.reject('foo');
        setTimeout(() => {
          expect(this.a.isBusy).toBe(false);
          done();
        });
      });

      it('sets the error property when the promise is rejected', function(done) {
        this.a.query();
        this.reject('foobar');
        setTimeout(() => {
          expect(this.a.error).toBe('foobar');
          done();
        });
      });

      it('clears the error property when the promise is resolved', function(done) {
        this.a.query();
        this.reject('foobar');
        setTimeout(() => {
          expect(this.a.error).toBe('foobar');
          this.a.query();
          this.resolve([]);
          setTimeout(() => {
            expect(this.a.error).toBeUndefined();
            done();
          });
        });
      });

      it('loads the resolved array of objects and replaces the contents of the array with the loaded models', function(done) {
        this.a.query();
        this.resolve([{id: 600, str: 's1'}, {id: 601, str: 's2'}]);
        setTimeout(() => {
          expect(this.a.length).toBe(2);
          expect(this.a[0].id).toBe(600);
          expect(this.a[0].str).toBe('s1');
          expect(this.a[1].id).toBe(601);
          expect(this.a[1].str).toBe('s2');
          done();
        });
      });

      it("does not invoke the mapper's query method when the array is busy", function() {
        this.a.query().query();
        expect(BasicModel.mapper.query.calls.count()).toBe(1);
      });

      it('queues the latest call to query when the array is busy and invokes the query method on the mapper when the in progress query finishes', function(done) {
        this.a.query({foo: 1});
        expect(this.a.isBusy).toBe(true);
        this.a.query({foo: 2});
        this.a.query({foo: 3});
        expect(BasicModel.mapper.query.calls.count()).toBe(1);
        expect(BasicModel.mapper.query).toHaveBeenCalledWith({foo: 1});
        this.resolve([]);
        setTimeout(() => {
          expect(BasicModel.mapper.query.calls.count()).toBe(2);
          expect(BasicModel.mapper.query).toHaveBeenCalledWith({foo: 3});
          done();
        });
      });

      it("throws an exception when the class's mapper is not defined", function() {
        class Foo extends Model {}

        expect(function() {
          Foo.buildQuery().query();
        }).toThrow(new Error('Foo.callMapper: no mapper defined, assign one to `Foo.mapper`'));
      });

      it("throws an exception when the class's mapper does not define a query method", function() {
        class Foo extends Model {}
        Foo.mapper = {};

        expect(function() {
          Foo.buildQuery().query();
        }).toThrow(new Error('Foo.callMapper: mapper does not implement `query`'));
      });

      it("throws an exception when the class's mapper.query method does not return a promise", function() {
        class Foo extends Model {}
        Foo.mapper = {query: function() {}};

        expect(function() {
          Foo.buildQuery().query();
        }).toThrow(new Error("Foo.callMapper: mapper's `query` method did not return a Promise"));
      });
    });

    describe('#then', function() {
      beforeEach(function() {
        this.onFulfilled = jasmine.createSpy('onFulfilled');
        this.onRejected  = jasmine.createSpy('onRejected');
      });

      describe('when called before the #query method', function() {
        it('invokes the fulfilled callback', function(done) {
          this.a.then(this.onFulfilled, this.onRejected);
          setTimeout(() => {
            expect(this.onFulfilled).toHaveBeenCalled();
            expect(this.onRejected).not.toHaveBeenCalled();
            done();
          });
        });
      });

      describe('when called after the #query method', function() {
        it('invokes the fulfilled callback when the mapper fulfills its promise', function(done) {
          this.a.query().then(this.onFulfilled, this.onRejected);
          this.resolve([]);
          setTimeout(() => {
            expect(this.onFulfilled).toHaveBeenCalled();
            expect(this.onRejected).not.toHaveBeenCalled();
            done();
          });
        });

        it('invokes the rejected callback when the mapper rejects its promise', function(done) {
          this.a.query().then(this.onFulfilled, this.onRejected);
          this.reject('foo');
          setTimeout(() => {
            expect(this.onFulfilled).not.toHaveBeenCalled();
            expect(this.onRejected).toHaveBeenCalled();
            done();
          });
        });
      });
    });

    describe('#catch', function() {
      beforeEach(function() {
        this.onRejected = jasmine.createSpy('onRejected');
      });

      describe('when called before the #query method', function() {
        it('does nothing', function(done) {
          this.a.catch(this.onRejected);
          setTimeout(() => {
            expect(this.onRejected).not.toHaveBeenCalled();
            done();
          });
        });
      });

      describe('when called after the #query method', function() {
        it('does nothing when the mapper fulfills its promise', function(done) {
          this.a.query().catch(this.onRejected);
          this.resolve([]);
          setTimeout(() => {
            expect(this.onRejected).not.toHaveBeenCalled();
            done();
          });
        });

        it('invokes the callback when the mapper rejects its promise', function(done) {
          this.a.query().catch(this.onRejected);
          this.reject('foo');
          setTimeout(() => {
            expect(this.onRejected).toHaveBeenCalledWith('foo');
            done();
          });
        });
      });
    });
  });

  describe('.get', function() {
    beforeEach(function() {
      var _this = this;

      BasicModel.mapper = {
        get: function(id) {
          return new Promise(function(resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
          });
        }
      };

      spyOn(BasicModel.mapper, 'get').and.callThrough();
    });

    describe('for an id of a model that is already loaded into the identity map', function() {
      it('returns the model in the identity map', function() {
        var m = BasicModel.load({id: 700, str: 'a', num: 2});
        expect(BasicModel.get(700)).toBe(m);
      });

      it("invokes the mapper's get method when the refresh option is set", function() {
        var m = BasicModel.load({id: 700, str: 'a', num: 2});
        BasicModel.get(700, {refresh: true});
        expect(BasicModel.mapper.get).toHaveBeenCalledWith(700, {});
      });
    });

    describe('for an id of a model that is not in the identity map', function() {
      it("invokes the mapper's get method", function() {
        var m = BasicModel.get(701);
        expect(BasicModel.mapper.get).toHaveBeenCalledWith(701, {});
      });

      it("forwards options on to the mapper's get method", function() {
        var m = BasicModel.get(702, {foo: 1, bar: 2});
        expect(BasicModel.mapper.get).toHaveBeenCalledWith(702, {foo: 1, bar: 2});
      });

      it('returns an EMPTY instance with isBusy set to true', function() {
        var m = BasicModel.get(703);
        expect(m.sourceState).toBe(Model.EMPTY);
        expect(m.isBusy).toBe(true);
      });

      it('sets the sourceState to LOADED and isBusy to false when the mapper resolves the promise', function(done) {
        var m = BasicModel.get(704);
        expect(m.sourceState).toBe(Model.EMPTY);
        this.resolve({id: 704, str: 'foo'});
        setTimeout(function() {
          expect(m.sourceState).toBe(Model.LOADED);
          expect(m.isBusy).toBe(false);
          done();
        });
      });

      it('loads the resolved object', function(done) {
        var m = BasicModel.get(705);
        expect(m.sourceState).toBe(Model.EMPTY);
        this.resolve({id: 705, str: 'abc', num: 21});
        setTimeout(function() {
          expect(m.str).toBe('abc');
          expect(m.num).toBe(21);
          done();
        });
      });

      it('does not set the sourceState to LOADED when the mapper rejects the promise', function(done) {
        var m = BasicModel.get(706);
        expect(m.sourceState).toBe(Model.EMPTY);
        this.reject('error!');
        setTimeout(function() {
          expect(m.sourceState).toBe(Model.EMPTY);
          done();
        });
      });

      it('sets isBusy to false when the mapper rejects the promise', function(done) {
        var m = BasicModel.get(707);
        expect(m.isBusy).toBe(true);
        this.reject('error!');
        setTimeout(function() {
          expect(m.isBusy).toBe(false);
          done();
        });
      });

      it('sets the error property when the mapper rejects the promise', function(done) {
        var m = BasicModel.get(708);
        this.reject('error!');
        setTimeout(function() {
          expect(m.error).toBe('error!');
          done();
        });
      });

      it('clears the error property when the mapper resolves the promise', function(done) {
        var m = BasicModel.get(708);
        this.reject('blah');
        setTimeout(() => {
          expect(m.error).toBe('blah');
          BasicModel.get(708);
          this.resolve({id: 708, str: 'asdf'});
          setTimeout(() => {
            expect(m.error).toBeUndefined();
            done();
          });
        });
      });
    });
  });

  describe('#get', function() {
    beforeEach(function() {
      var _this = this;

      BasicModel.mapper = {
        get: function(id) {
          return new Promise(function(resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
          });
        }
      };

      spyOn(BasicModel.mapper, 'get').and.callThrough();
    });

    it("calls the mapper's get method", function() {
      var m = BasicModel.load({id: 750, str: 'x', num: 4});

      m.get();
      expect(BasicModel.mapper.get).toHaveBeenCalledWith(750, {});
    });

    it('forwards the given options to the mapper', function() {
      var m = BasicModel.load({id: 751, str: 'x', num: 4});

      m.get({x: 1, y: 2});
      expect(BasicModel.mapper.get).toHaveBeenCalledWith(751, {x: 1, y: 2});
    });

    it('returns the receiver', function() {
      var m = BasicModel.load({id: 752, str: 'x', num: 4});
      expect(m.get()).toBe(m);
    });

    it('throws an exception when the model is NEW', function() {
      var m = new BasicModel;

      expect(m.isNew).toBe(true);
      expect(function() {
        m.get();
      }).toThrow(new Error(`BasicModel#get: can't get a model in the NEW state: ${m}`));
    });

    it('throws an exception when the model is BUSY', function() {
      var m = BasicModel.get(753);

      expect(m.isBusy).toBe(true);
      expect(function() {
        m.get();
      }).toThrow(new Error(`BasicModel#get: can't get a model in the EMPTY-BUSY state: ${m}`));
    });

    it('throws an exception when the model is DELETED', function() {
      // FIXME
    });
  });

  describe('#save', function() {
    describe('on a NEW model', function() {
      beforeEach(function() {
        var _this = this;

        BasicModel.mapper = {
          create: function(model) {
            return new Promise(function(resolve, reject) {
              _this.resolve = resolve;
              _this.reject = reject;
            });
          },
        };

        spyOn(BasicModel.mapper, 'create').and.callThrough();

        this.model = new BasicModel;
      });

      it("invokes the mapper's create method with the receiver", function() {
        this.model.save();
        expect(BasicModel.mapper.create).toHaveBeenCalledWith(this.model, {});
      });

      it("forwards the options on to the mapper's create method", function() {
        this.model.save({a: 1, b: 2});
        expect(BasicModel.mapper.create).toHaveBeenCalledWith(this.model, {a: 1, b: 2});
      });

      it('sets isBusy to true', function() {
        expect(this.model.isBusy).toBe(false);
        this.model.save();
        expect(this.model.isBusy).toBe(true);
      });

      it('sets isBusy to false when the mapper resolves the promise', function(done) {
        this.model.save();
        expect(this.model.isBusy).toBe(true);
        this.resolve({id: 123});
        setTimeout(() => {
          expect(this.model.isBusy).toBe(false);
          done();
        });
      });

      it('sets sourceState to LOADED when the mapper resolves the promise', function(done) {
        this.model.save();
        expect(this.model.sourceState).toBe(Model.NEW);
        this.resolve({id: 123});
        setTimeout(() => {
          expect(this.model.sourceState).toBe(Model.LOADED);
          done();
        });
      });

      it('loads the resolved attributes', function(done) {
        this.model.save();
        this.resolve({id: 123, str: 'the string', num: 6});
        setTimeout(() => {
          expect(this.model.id).toBe(123);
          expect(this.model.str).toBe('the string');
          expect(this.model.num).toBe(6);
          done();
        });
      });

      it('does not change the sourceState when the mapper rejects the promise', function(done) {
        this.model.save();
        expect(this.model.sourceState).toBe(Model.NEW);
        this.reject('failed');
        setTimeout(() => {
          expect(this.model.sourceState).toBe(Model.NEW);
          done();
        });
      });

      it('sets isBusy to false when the mapper rejects the promise', function(done) {
        this.model.save();
        expect(this.model.isBusy).toBe(true);
        this.reject('failed');
        setTimeout(() => {
          expect(this.model.isBusy).toBe(false);
          done();
        });
      });

      it('sets the error property when the mapper rejects the promise', function(done) {
        this.model.save();
        this.reject('failed');
        setTimeout(() => {
          expect(this.model.error).toBe('failed');
          done();
        });
      });

      it('clears the error property when the mapper resolves the promise', function(done) {
        this.model.save();
        this.reject('failed');
        setTimeout(() => {
          expect(this.model.error).toBe('failed');
          this.model.save();
          this.resolve({id: 123});
          setTimeout(() => {
            expect(this.model.error).toBeUndefined();
            done();
          });
        });
      });
    });

    describe('on a LOADED model', function() {
      beforeEach(function() {
        var _this = this;

        BasicModel.mapper = {
          update: function(model) {
            return new Promise(function(resolve, reject) {
              _this.resolve = resolve;
              _this.reject = reject;
            });
          },
        };

        spyOn(BasicModel.mapper, 'update').and.callThrough();

        this.model = BasicModel.load({id: 800, str: 'abc', num: 12});
      });

      it("invokes the mapper's update method", function() {
        this.model.save();
        expect(BasicModel.mapper.update).toHaveBeenCalledWith(this.model, {});
      });

      it("forwards the options on to the mapper's update method", function() {
        this.model.save({a: 1, b: 2});
        expect(BasicModel.mapper.update).toHaveBeenCalledWith(this.model, {a: 1, b: 2});
      });

      it('throws an exception when the model is BUSY', function() {
        this.model.save();
        expect(this.model.isBusy).toBe(true);
        expect(() => {
          this.model.save();
        }).toThrow(new Error(`BasicModel#save: can't save a model in the LOADED-BUSY state: ${this.model}`));
      });

      it('sets isBusy to true', function() {
        expect(this.model.isBusy).toBe(false);
        this.model.save();
        expect(this.model.isBusy).toBe(true);
      });

      it('sets isBusy to false when the mapper resolves the promise', function(done) {
        this.model.save();
        expect(this.model.isBusy).toBe(true);
        this.resolve({id: 800});
        setTimeout(() => {
          expect(this.model.isBusy).toBe(false);
          done();
        });
      });

      it('loads the resolved attributes', function(done) {
        this.model.save();
        this.resolve({id: 800, str: 'xyz', num: 14});
        setTimeout(() => {
          expect(this.model.str).toBe('xyz');
          expect(this.model.num).toBe(14);
          done();
        });
      });

      it('sets isBusy to false when the mapper rejects the promise', function(done) {
        this.model.save();
        expect(this.model.isBusy).toBe(true);
        this.reject('no');
        setTimeout(() => {
          expect(this.model.isBusy).toBe(false);
          done();
        });
      });

      it('sets the error property when the mapper rejects the promise', function(done) {
        this.model.save();
        expect(this.model.error).toBeUndefined();
        this.reject('no');
        setTimeout(() => {
          expect(this.model.error).toBe('no');
          done();
        });
      });

      it('clears the error property when the mapper resolves the promise', function(done) {
        this.model.save();
        expect(this.model.error).toBeUndefined();
        this.reject('no');
        setTimeout(() => {
          expect(this.model.error).toBe('no');
          this.model.save();
          this.resolve({id: 800});
          setTimeout(() => {
            expect(this.model.error).toBeUndefined();
            done();
          });
        });
      });
    });

    describe('on an EMPTY model', function() {
      it('throws an exception', function() {
        var m = BasicModel.empty(12);

        expect(function() {
          m.save();
        }).toThrow(new Error(`BasicModel#save: can't save a model in the EMPTY state: ${m}`));
      });
    });

    describe('on a DELETED model', function() {
      beforeEach(function() {
        var _this = this;

        BasicModel.mapper.delete = function() {
          return new Promise(function(resolve) {
            _this.deleteResolve = resolve;
          });
        };
      });

      it('throws an exception', function(done) {
        var m = BasicModel.load({id: 801});
        m.delete();
        this.deleteResolve();
        setTimeout(function() {
          expect(m.sourceState).toBe(Model.DELETED);
          expect(function() {
            m.save();
          }).toThrow(new Error(`BasicModel#save: can't save a model in the DELETED state: ${m}`));
          done();
        });
      });
    });
  });

  describe('#delete', function() {
    beforeEach(function() {
      var _this = this;

      BasicModel.mapper = {
        get: function(id) { return new Promise(function() {}); },
        delete: function(model) {
          return new Promise(function(resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
          });
        },
      };

      spyOn(BasicModel.mapper, 'delete').and.callThrough();

      this.model = BasicModel.load({id: 123});
    });

    it("invokes the mapper's delete method", function() {
      this.model.delete();
      expect(BasicModel.mapper.delete).toHaveBeenCalledWith(this.model, {});
    });

    it("passes along the options to the mapper's delete method", function() {
      this.model.delete({x: 9, y: 7});
      expect(BasicModel.mapper.delete).toHaveBeenCalledWith(this.model, {x: 9, y: 7});
    });

    it('sets isBusy to true', function() {
      expect(this.model.isBusy).toBe(false);
      this.model.delete();
      expect(this.model.isBusy).toBe(true);
    });

    it('sets isBusy to false when the mapper resolves its promise', function(done) {
      this.model.delete();
      expect(this.model.isBusy).toBe(true);
      this.resolve();
      setTimeout(() => {
        expect(this.model.isBusy).toBe(false);
        done();
      });
    });

    it('sets sourceState to DELETED when the mapper resolves its promise', function(done) {
      this.model.delete();
      expect(this.model.sourceState).toBe(Model.LOADED);
      this.resolve();
      setTimeout(() => {
        expect(this.model.sourceState).toBe(Model.DELETED);
        done();
      });
    });

    it('removes the model from the identity map when the mapper resolves its promise', function(done) {
      this.model.delete();
      expect(BasicModel.get(this.model.id)).toBe(this.model);
      this.resolve();
      setTimeout(() => {
        var m = BasicModel.get(this.model.id);
        expect(m).not.toBe(this.model);
        expect(m.isEmpty).toBe(true);
        done();
      });
    });

    it('removes the model from any associations when the mapper resolves the promise', function(done) {
      Post.mapper = BasicModel.mapper;

      var p = Post.load({
        id: 184, title: 'the title', body: 'the body',
        author: {id: 9, first: 'Homer', last: 'Simpson'},
        tags: [{id: 18, name: 'the tag'}]
      });

      var a = p.author;
      var t = p.tags[0];

      expect(a.posts).toEqual([p]);
      expect(t.posts).toEqual([p]);
      p.delete();
      this.resolve();
      setTimeout(() => {
        expect(a.posts).toEqual([]);
        expect(t.posts).toEqual([]);
        done();
      });
    });

    it('sets isBusy to false when the mapper rejects its promise', function(done) {
      this.model.delete();
      expect(this.model.isBusy).toBe(true);
      this.reject();
      setTimeout(() => {
        expect(this.model.isBusy).toBe(false);
        done();
      });
    });

    it('does not change the sourceState when the mapper rejects its promise', function(done) {
      this.model.delete();
      expect(this.model.sourceState).toBe(Model.LOADED);
      this.reject();
      setTimeout(() => {
        expect(this.model.sourceState).toBe(Model.LOADED);
        done();
      });
    });

    it("does not invoke the mapper's delete method when the model is in the NEW state", function() {
      var model = new BasicModel;

      model.delete();
      expect(BasicModel.mapper.delete).not.toHaveBeenCalled();
    });

    it('does nothing when the model state is DELETED', function(done) {
      this.model.delete();
      this.resolve();
      setTimeout(() => {
        BasicModel.mapper.delete.calls.reset();
        expect(this.model.sourceState).toBe(Model.DELETED);
        this.model.delete();
        expect(BasicModel.mapper.delete).not.toHaveBeenCalled();
        done();
      });
    });

    it('throws an exception when the model is BUSY', function() {
      this.model.delete();
      expect(this.model.isBusy).toBe(true);
      expect(() => {
        this.model.delete();
      }).toThrow(new Error(`BasicModel#delete: can't delete a model in the LOADED-BUSY state: ${this.model}`));
    });
  });

  describe('#then', function() {
    beforeEach(function() {
      this.onFulfilled = jasmine.createSpy('onFulfilled');
      this.onRejected = jasmine.createSpy('onRejected');
    });

    describe('on a NEW model', function() {
      it('invokes the fulfillment callback immediately', function(done) {
        var m = new BasicModel;
        m.then(this.onFulfilled, this.onRejected);
        setTimeout(() => {
          expect(this.onFulfilled).toHaveBeenCalledWith(undefined);
          done();
        });
      });
    });

    describe('on a BUSY model', function() {
      beforeEach(function() {
        var _this = this;

        BasicModel.mapper.get = function() {
          return new Promise(function(resolve, reject) {
            _this.resolve = resolve;
            _this.reject  = reject;
          });
        };
      });

      it('invokes the fulfillment callback when the mapper resolves the pending promise', function(done) {
        var m = BasicModel.get(19);
        expect(m.isBusy).toBe(true);
        m.then(this.onFulfilled, this.onRejected);
        this.resolve({id: 19});
        setTimeout(() => {
          expect(this.onFulfilled).toHaveBeenCalledWith(undefined);
          done();
        });
      });

      it('returns a new promise that is resolved with the return value of the fulfillment handler', function(done) {
        var m = BasicModel.get(19);
        var p = m.then(function() { return 'foo'; });
        var spy = jasmine.createSpy();
        p.then(spy);
        this.resolve({id: 19});
        setTimeout(() => {
          expect(spy).toHaveBeenCalledWith('foo');
          done();
        });
      });

      it('invokes the rejected callback when the mapper rejects the pending promise', function(done) {
        var m = BasicModel.get(19);
        expect(m.isBusy).toBe(true);
        m.then(this.onFulfilled, this.onRejected);
        this.reject('blah');
        setTimeout(() => {
          expect(this.onRejected).toHaveBeenCalledWith('blah');
          done();
        });
      });
    });
  });

  describe('#catch', function() {
    beforeEach(function() {
      var _this = this;

      BasicModel.mapper.get = function() {
        return new Promise(function(resolve, reject) {
          _this.resolve = resolve;
          _this.reject  = reject;
        });
      };

      this.onRejected = jasmine.createSpy('onRejected');
    });

    it('invokes the callback when the mapper rejects the pending promise', function(done) {
      var m = BasicModel.get(19);
      expect(m.isBusy).toBe(true);
      m.catch(this.onRejected);
      this.reject('blah');
      setTimeout(() => {
        expect(this.onRejected).toHaveBeenCalledWith('blah');
        done();
      });
    });
  });

  describe('#load', function() {
    it('sets the given id on the receiver and loads the attributes', function() {
      var a = new Author;

      a.load({id: 5, first: 'Homer', last: 'Simpson'});
      expect(a.sourceState).toBe(Model.LOADED);
      expect(a.id).toBe(5);
      expect(a.first).toBe('Homer');
      expect(a.last).toBe('Simpson');
    });

    it('loads the attributes when not given an id', function() {
      var a = Author.load({id: 3, first: 'Homer', last: 'Simpson'});

      a.load({first: 'Ned', last: 'Flanders'});
      expect(a.id).toBe(3);
      expect(a.first).toBe('Ned');
      expect(a.last).toBe('Flanders');
    });

    it('throws an exception for a NEW model when given attributes without an id', function() {
      var a = new Author;

      expect(function() {
        a.load({first: 'Bart', last: 'Simpson'});
      }).toThrow(new Error('Author#load: an `id` attribute is required'));
    });

    it("throws an exception when given attributes with an id that does not match the receiver's id", function() {
      var a = Author.load({id: 3, first: 'Homer', last: 'Simpson'});

      expect(function() {
        a.load({id: 4, first: 'Bart', last: 'Simpson'});
      }).toThrow(new Error('Author#load: received attributes with id `4` but model already has id `3`'));
    });
  });
});

