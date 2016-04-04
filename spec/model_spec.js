import "es6-shim";
import TransisObject from "../object";
import Model from "../model";
import IdMap from "../id_map";
import TransisArray from "../array";

var A = TransisArray.of;

describe('Model', function () {
  var TestMapper = {
    query: function() {},
    get: function() {},
    create: function() {},
    update: function() {},
    delete: function() {}
  };

  var BasicModel = Model.extend('BasicModel', function() {
    this.attr('str', 'string');
    this.attr('strWithDefault', 'string', {default: 'zzz'});
    this.attr('num', 'number');
    this.attr('date', 'date');
  });

  var Author = Model.extend('Author', function() {
    this.attr('first', 'string');
    this.attr('last', 'string');
    this.hasMany('posts', 'Post', {inverse: 'author'});
  });

  var Post = Model.extend('Post', function() {
    this.attr('title', 'string');
    this.attr('body', 'string');
    this.hasOne('author', 'Author', {inverse: 'posts'});
    this.hasMany('tags', 'Tag', {inverse: 'posts'});
  });

  var Tag = Model.extend('Tag', function() {
    this.attr('name', 'string');
    this.hasMany('posts', 'Post', {inverse: 'tags'});
  });

  var Company = Model.extend('Company', function() {
    this.hasMany('invoices', 'Invoice', {inverse: 'company'});
    this.attr('name', 'string');
  });

  var Address = Model.extend('Address', function() {
    this.attr('name', 'string');
    this.attr('address', 'string');
  });

  var Invoice = Model.extend('Invoice', function() {
    this.hasOne('company', 'Company', {inverse: 'invoices'});
    this.hasOne('billingAddress', 'Address', {owner: true});
    this.hasMany('lineItems', 'LineItem', {owner: true, inverse: 'invoice'});
    this.attr('name', 'string');
  });

  var LineItem = Model.extend('LineItem', function() {
    this.hasOne('invoice', 'Invoice', {inverse: 'lineItems'});
    this.attr('name', 'string');
    this.attr('quantity', 'number');
    this.attr('rate', 'number');
  });

  var CircularA = Model.extend('CircularA', function() {
    this.attr('name', 'string');
    this.hasMany('bs', 'CircularB', {inverse: 'as', owner: true});
  });

  var CircularB = Model.extend('CircularB', function() {
    this.attr('name', 'string');
    this.hasMany('as', 'CircularA', {inverse: 'bs', owner: true});
  });

  beforeEach(function() {
    BasicModel.mapper = TestMapper;
  });

  afterEach(function() { IdMap.clear(); });

  describe('.extend', function() {
    var Child = Model.extend('Child', function() {
      this.prototype.init = function() {};
    });

    var Grandchild = Child.extend('Grandchild', function() {
      this.prototype.init = function() {};
    });

    it("sets the name argument as the subclass's displayName property", function() {
      expect(Child.displayName).toBe('Child');
      expect(Grandchild.displayName).toBe('Grandchild');
    });

    describe('with no name argument', function() {
      it('throws an exception', function() {
        expect(function() {
          Model.extend();
        }).toThrow(new Error('Transis.Model.extend: a name is required'));
      });
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
      }).toThrow(new Error('Transis.Model.registerAttr: an attribute with the name `string` has already been defined'));
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

    it('defines a property that sets its value on a property prefixed with `__`', function() {
      expect(this.m.__str).toBeUndefined();
      this.m.str = 'abc';
      expect(this.m.__str).toBe('abc');
    });

    it('defines a property that gets its value from a property prefixed with `__`', function() {
      this.m.__str = 'xyz';
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
      var Baz = Model.extend('Baz');
      var Bar = Model.extend('Bar', function() {
        this.attr('x', 'number');
        this.hasMany('bazs', Baz);
      });
      var Foo = Model.extend('Foo', function() {
        this.hasOne('bar', Bar);
      });

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

      it('notifies `<name>` observers when the associated model is set', function() {
        var f = new Foo, b = new Bar, spy = jasmine.createSpy();

        f.on('bar', spy);
        f.bar = b;
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('bar');
        f.bar = undefined;
        TransisObject.flush();
        expect(spy.calls.count()).toBe(2);
      });

      it('notifies `<name>.<prop name>` observers when the associated model changes', function() {
        var b = new Bar({x: 1}), f = new Foo({bar: b}), spy = jasmine.createSpy();

        f.on('bar.x', spy);
        b.x = 2;
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('bar.x');
      });

      it('notifies `<name>.<prop name>` events when the associated model has a hasMany mutation', function() {
        var b = new Bar, f = new Foo({bar: b}), baz = new Baz, spy = jasmine.createSpy();

        f.on('bar.bazs', spy);
        b.bazs.push(baz);
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('bar.bazs');
      });
    });

    describe('with a hasOne inverse', function() {
      var Bar = Model.extend('Bar');
      var Foo = Model.extend('Foo');
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

      it('notifies observers on the inverse side', function() {
        var f = new Foo, b = new Bar, spy = jasmine.createSpy();

        b.on('foo', spy);

        f.bar = b;
        TransisObject.flush();
        expect(spy).toHaveBeenCalled();
      });
    });

    describe('with a hasMany inverse', function() {
      var Foo = Model.extend('Foo');
      var Bar = Model.extend('Bar');
      Foo.hasOne('bar', Bar, {inverse: 'foos'});
      Bar.hasMany('foos', Foo, {inverse: 'bar'});

      it('adds the receiver to the inverse array when setting', function() {
        var f1 = new Foo, f2 = new Foo, b = new Bar;

        f1.bar = b;
        expect(b.foos).toEqual(A(f1));
        f2.bar = b;
        expect(b.foos).toEqual(A(f1, f2));
      });

      it('removes the receiver from the inverse array when clearing', function() {
        var f1 = new Foo, f2 = new Foo, b = new Bar;

        f1.bar = b;
        f2.bar = b;
        expect(b.foos).toEqual(A(f1, f2));
        f1.bar = null;
        expect(b.foos).toEqual(A(f2));
        f2.bar = null;
        expect(b.foos).toEqual(A());
      });

      it('notifies observers on the inverse side', function() {
        var f = new Foo, b = new Bar, spy = jasmine.createSpy();

        b.on('foos', spy);
        f.bar = b;
        TransisObject.flush();
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('.hasMany', function() {
    describe('with no inverse', function() {
      var Baz = Model.extend('Baz');
      var Bar = Model.extend('Bar', function() {
        this.attr('x', 'number');
        this.hasMany('bazs', Baz);
      });
      var Foo = Model.extend('Foo', function() {
        this.hasMany('bars', Bar);
      });

      it('creates a property with the given name', function() {
        expect('bars' in Foo.prototype).toBe(true);
      });

      it('initializes the property to an empty array', function() {
        var f = new Foo;
        expect(f.bars).toEqual(A());
      });

      it('throws an exception when setting models of the wrong type', function() {
        var f = new Foo, b = new BasicModel;

        expect(function() {
          f.bars = [b];
        }).toThrow(new Error(`Foo#bars: expected an object of type \`Bar\` but received \`${b}\` instead`));
      });

      it('throws an exception when adding objects of the wrong type', function() {
        var f = new Foo, b = new BasicModel;

        expect(function() {
          f.bars.push(b);
        }).toThrow(new Error(`Foo#bars: expected an object of type \`Bar\` but received \`${b}\` instead`));
      });

      it('notifies `<name>` observers when models are added', function() {
        var f = new Foo, b = new Bar, spy = jasmine.createSpy();

        f.on('bars', spy);
        f.bars.push(b);
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('bars');
      });

      it('notifies `<name>` observers when models are removed', function() {
        var f = new Foo, b = new Bar, spy = jasmine.createSpy();

        f.bars.push(b);
        f.on('bars', spy);
        f.bars.pop();
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('bars');
      });

      it('notifies `<name>.<prop name>` observers when an associated model changes', function() {
        var f = new Foo, b = new Bar({x: 1}), spy = jasmine.createSpy();

        f.bars = [b];
        f.on('bars.x', spy);
        b.x = 2;
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('bars.x');
      });

      it('notifies `<name>.<prop name>` observers when an associated model has a hasMany mutation', function() {
        var b = new Bar, f = new Foo({bars: b}), baz = new Baz, spy = jasmine.createSpy();

        f.on('bars.bazs', spy);
        b.bazs.push(baz);
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('bars.bazs');
      });
    });

    describe('with a hasOne inverse', function() {
      var Foo = Model.extend('Foo');
      var Bar = Model.extend('Bar');
      Foo.hasMany('bars', Bar, {inverse: 'foo'});
      Bar.hasOne('foo', Foo, {inverse: 'bars'});

      it('sets the hasOne side when adding to the hasMany side', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
        f.bars.push(b1);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBeUndefined();
        f.bars.push(b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
      });

      it('sets the hasOne side when setting the hasMany side', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
        f.bars = A(b1, b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
      });

      it('clears the hasOne side when removing from the hasMany side', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.bars.push(b1, b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
        f.bars.splice(f.bars.indexOf(b2), 1);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBeUndefined();
      });

      it('clears the hasOne side when the hasMany side is cleared', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.bars.push(b1, b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
        f.bars.clear();
        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
      });

      it('clears the hasOne side when the hasMany side is set to an empty array', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.bars.push(b1, b2);
        expect(b1.foo).toBe(f);
        expect(b2.foo).toBe(f);
        f.bars = [];
        expect(b1.foo).toBeUndefined();
        expect(b2.foo).toBeUndefined();
      });

      it('notifies observers on the inverse side', function() {
        var f = new Foo, b = new Bar, spy = jasmine.createSpy();

        b.on('foo', spy);
        f.bars.push(b);
        TransisObject.flush();
        expect(spy).toHaveBeenCalled();
      });
    });

    describe('with a hasMany inverse', function() {
      var Foo = Model.extend('Foo');
      var Bar = Model.extend('Bar');
      Foo.hasMany('bars', Bar, {inverse: 'foos'});
      Bar.hasMany('foos', Foo, {inverse: 'bars'});

      it('adds the receiver on the inverse side when a model is added', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        expect(f.bars).toEqual(A());
        expect(b1.foos).toEqual(A());
        expect(b2.foos).toEqual(A());
        f.bars.push(b1);
        expect(f.bars).toEqual(A(b1));
        expect(b1.foos).toEqual(A(f));
        expect(b2.foos).toEqual(A());
        f.bars.push(b2);
        expect(f.bars).toEqual(A(b1, b2));
        expect(b1.foos).toEqual(A(f));
        expect(b2.foos).toEqual(A(f));
      });

      it('adds the receiver on the inverse side when the association is set', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.bars = A(b1, b2);
        expect(f.bars).toEqual(A(b1, b2));
        expect(b1.foos).toEqual(A(f));
        expect(b2.foos).toEqual(A(f));
      });

      it('removes the receiver from the inverse side of the previously associated models when the association is set', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar, b3 = new Bar, b4 = new Bar;

        f.bars = [b1, b2];
        expect(f.bars).toEqual(A(b1, b2));
        expect(b1.foos).toEqual(A(f));
        expect(b2.foos).toEqual(A(f));
        f.bars = [b3, b4];
        expect(f.bars).toEqual(A(b3, b4));
        expect(b1.foos).toEqual(A());
        expect(b2.foos).toEqual(A());
      });

      it('removes the receiver from the inverse side when a model is removed', function() {
        var f = new Foo, b1 = new Bar, b2 = new Bar;

        f.bars.push(b1, b2);
        expect(f.bars).toEqual(A(b1, b2));
        expect(b1.foos).toEqual(A(f));
        expect(b2.foos).toEqual(A(f));
        f.bars.splice(f.bars.indexOf(b2), 1);
        expect(f.bars).toEqual(A(b1));
        expect(b1.foos).toEqual(A(f));
        expect(b2.foos).toEqual(A());
        b1.foos.splice(b1.foos.indexOf(f), 1);
        expect(f.bars).toEqual(A());
        expect(b1.foos).toEqual(A());
        expect(b2.foos).toEqual(A());
      });

      it('notifies observers on the inverse side', function() {
        var f = new Foo, b = new Bar, spy = jasmine.createSpy();

        b.on('foos', spy);
        f.bars.push(b);
        TransisObject.flush();
        expect(spy).toHaveBeenCalled();
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
      beforeEach(function () {
        this.p = Post.load({
          id: 184, title: 'the title', body: 'the body',
          author: {id: 9, first: 'Homer', last: 'Simpson'}
        });
      });

      it('loads the nested model and hooks up the association', function() {
        expect(this.p.author).toBe(Author.get(9));
        expect(this.p.author.id).toBe(9);
        expect(this.p.author.first).toBe('Homer');
        expect(this.p.author.last).toBe('Simpson');
      });

      it('clears the existing association when given a null value', function () {
        Post.load({
          id: 184, title: 'the title', body: 'the body',
          author: null
        })
        expect(this.p.author).toBe(null);
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

        expect(p.tags.at(0).id).toBe(10);
        expect(p.tags.at(0).name).toBe('tag a');
        expect(p.tags.at(0).posts).toEqual(A(p));
        expect(p.tags.at(1).id).toBe(11);
        expect(p.tags.at(1).name).toBe('tag b');
        expect(p.tags.at(1).posts).toEqual(A(p));
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

          expect(t1.posts).toEqual(A());
          expect(t2.posts).toEqual(A());

          var p = Post.load({id: 152, title: 'the title', body: 'the body', tags: [40, 41]});

          expect(t1.posts).toEqual(A(p));
          expect(t2.posts).toEqual(A(p));
          expect(p.tags).toEqual(A(t1, t2));
        });
      });

      describe('where the id does not exist in the identity map', function() {
        it('creates an empty instance of the associated models and hooks up the associations', function() {
          var p = Post.load({id: 153, title: 'the title', body: 'the body', tags: [42, 43]});

          expect(p.tags.at(0).id).toBe(42);
          expect(p.tags.at(0).sourceState).toBe(Model.EMPTY);
          expect(p.tags.at(0).posts).toEqual(A(p));
          expect(p.tags.at(1).id).toBe(43);
          expect(p.tags.at(1).sourceState).toBe(Model.EMPTY);
          expect(p.tags.at(1).posts).toEqual(A(p));
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

        expect(p.tags.at(0).id).toBe(48);
        expect(p.tags.at(0).sourceState).toBe(Model.LOADED);
        expect(p.tags.at(0).posts).toEqual(A(p));
        expect(p.tags.at(1).id).toBe(49);
        expect(p.tags.at(1).sourceState).toBe(Model.LOADED);
        expect(p.tags.at(1).posts).toEqual(A(p));
        expect(p.tags.at(2).id).toBe(50);
        expect(p.tags.at(2).sourceState).toBe(Model.EMPTY);
        expect(p.tags.at(2).posts).toEqual(A(p));
        expect(p.tags.map((t) => t.id)).toEqual([48, 49, 50]);
      });
    });

    it('handles 0 ids', function() {
      expect(() => {
        Post.load({id: 0});
      }).not.toThrow();
    });

    it('returns an instance with no changes', function() {
      var t = Tag.load({id: 49, name: 'foobar'});
      expect(t.hasChanges).toBe(false);
    });

    it('does not mark changes for associated models', function() {
      var p  = Post.load({
        id: 157, title: 'the title', body: 'the body',
        tags: [{id: 50, name: 'foo'}, 50]
      });

      expect(p.hasChanges).toBe(false);
      expect(p.tags.first.hasChanges).toBe(false);
    });

    it('does not mark changes on many-to-many associations', function() {
      var a = CircularA.load({id: 99, bs: [{id: 100}]});

      expect(a.hasChanges).toBe(false);
      expect(a.bs.first.hasChanges).toBe(false);
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

    it('returns an empty Transis.Array', function() {
      expect(this.a).toEqual([]);
      expect(this.a instanceof TransisArray).toBe(true);
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

  describe('query array', function() {
    var QueryTest = Model.extend('QueryTest', function() {
      this.attr('str', 'string');
      this.attr('num', 'number');
    });

    beforeEach(function() {
      var _this = this;

      QueryTest.mapper = {
        query: function() {
          return new Promise(function(resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
          });
        }
      };

      spyOn(QueryTest.mapper, 'query').and.callThrough();

      this.a = QueryTest.buildQuery();
    });

    describe('#query', function() {
      it('invokes the query method on the data mapper', function() {
        this.a.query();
        expect(QueryTest.mapper.query).toHaveBeenCalledWith({});
      });

      it('forwards the first argument to the data mapper', function() {
        this.a.query({foo: 9, bar: 'baz'});
        expect(QueryTest.mapper.query).toHaveBeenCalledWith({foo: 9, bar: 'baz'});
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
        this.delay(() => {
          expect(this.a.isBusy).toBe(false);
          done();
        });
      });

      it('sets the isBusy property to false when the promise is rejected', function(done) {
        this.a.query();
        expect(this.a.isBusy).toBe(true);
        this.reject('foo');
        this.delay(() => {
          expect(this.a.isBusy).toBe(false);
          done();
        });
      });

      it('sets the error property when the promise is rejected', function(done) {
        this.a.query();
        this.reject('foobar');
        this.delay(() => {
          expect(this.a.error).toBe('foobar');
          done();
        });
      });

      it('clears the error property when the promise is resolved', function(done) {
        this.a.query();
        this.reject('foobar');
        this.delay(() => {
          expect(this.a.error).toBe('foobar');
          this.a.query();
          this.resolve([]);
          this.delay(() => {
            expect(this.a.error).toBeUndefined();
            done();
          });
        });
      });

      describe('when resolved with an array', function() {
        it('loads the resolved array of objects and replaces the contents of the array with the loaded models', function(done) {
          this.a.query();
          this.resolve([{id: 600, str: 's1'}, {id: 601, str: 's2'}]);
          this.delay(() => {
            expect(this.a.length).toBe(2);
            expect(this.a.at(0).id).toBe(600);
            expect(this.a.at(0).str).toBe('s1');
            expect(this.a.at(1).id).toBe(601);
            expect(this.a.at(1).str).toBe('s2');
            done();
          });
        });
      });

      describe('when resolved with an object containing `results` and `meta` keys', function() {
        it('loads the results key and sets the meta property', function(done) {
          this.a.query();
          this.resolve({
            meta: {total: 121, current_page: 1, next_page: 2},
            results: [{id: 600, str: 's1'}, {id: 601, str: 's2'}]
          });
          this.delay(() => {
            expect(this.a.length).toBe(2);
            expect(this.a.at(0).id).toBe(600);
            expect(this.a.at(0).str).toBe('s1');
            expect(this.a.at(1).id).toBe(601);
            expect(this.a.at(1).str).toBe('s2');
            expect(this.a.meta).toEqual({total: 121, current_page: 1, next_page: 2});
            done();
          });
        });
      });

      it("does not invoke the mapper's query method when the array is busy", function() {
        this.a.query().query();
        expect(QueryTest.mapper.query.calls.count()).toBe(1);
      });

      it('queues the latest call to query when the array is busy and invokes the query method on the mapper when the in progress query finishes', function(done) {
        this.a.query({foo: 1});
        expect(this.a.isBusy).toBe(true);
        this.a.query({foo: 2});
        this.a.query({foo: 3});
        expect(QueryTest.mapper.query.calls.count()).toBe(1);
        expect(QueryTest.mapper.query).toHaveBeenCalledWith({foo: 1});
        this.resolve([]);
        this.delay(() => {
          expect(QueryTest.mapper.query.calls.count()).toBe(2);
          expect(QueryTest.mapper.query).toHaveBeenCalledWith({foo: 3});
          done();
        });
      });

      it('properly resolves the promise when the query is queued', function(done) {
        var spy1 = jasmine.createSpy(), spy2 = jasmine.createSpy();

        this.a.query({foo: 1}).then(spy1);
        this.a.query({foo: 2}).then(spy2);
        this.resolve([]);
        this.delay(function() {
          expect(spy1).toHaveBeenCalled();
          expect(spy2).not.toHaveBeenCalled();
          this.resolve([]);
          this.delay(function() {
            expect(spy2).toHaveBeenCalled();
            done();
          });
        }.bind(this));
      });

      it("throws an exception when the class's mapper is not defined", function() {
        var Foo = Model.extend('Foo');

        expect(function() {
          Foo.buildQuery().query();
        }).toThrow(new Error('Foo._callMapper: no mapper defined, assign one to `Foo.mapper`'));
      });

      it("throws an exception when the class's mapper does not define a query method", function() {
        var Foo = Model.extend('Foo');
        Foo.mapper = {};

        expect(function() {
          Foo.buildQuery().query();
        }).toThrow(new Error('Foo._callMapper: mapper does not implement `query`'));
      });

      it("throws an exception when the class's mapper.query method does not return a promise", function() {
        var Foo = Model.extend('Foo');
        Foo.mapper = {query: function() {}};

        expect(function() {
          Foo.buildQuery().query();
        }).toThrow(new Error("Foo._callMapper: mapper's `query` method did not return a Promise"));
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
          this.delay(() => {
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
          this.delay(() => {
            expect(this.onFulfilled).toHaveBeenCalled();
            expect(this.onRejected).not.toHaveBeenCalled();
            done();
          });
        });

        it('invokes the rejected callback when the mapper rejects its promise', function(done) {
          this.a.query().then(this.onFulfilled, this.onRejected);
          this.reject('foo');
          this.delay(() => {
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
          this.delay(() => {
            expect(this.onRejected).not.toHaveBeenCalled();
            done();
          });
        });
      });

      describe('when called after the #query method', function() {
        it('does nothing when the mapper fulfills its promise', function(done) {
          this.a.query().catch(this.onRejected);
          this.resolve([]);
          this.delay(() => {
            expect(this.onRejected).not.toHaveBeenCalled();
            done();
          });
        });

        it('invokes the callback when the mapper rejects its promise', function(done) {
          this.a.query().catch(this.onRejected);
          this.reject('foo');
          this.delay(() => {
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
        this.delay(function() {
          expect(m.sourceState).toBe(Model.LOADED);
          expect(m.isBusy).toBe(false);
          done();
        });
      });

      it('loads the resolved object', function(done) {
        var m = BasicModel.get(705);
        expect(m.sourceState).toBe(Model.EMPTY);
        this.resolve({id: 705, str: 'abc', num: 21});
        this.delay(function() {
          expect(m.str).toBe('abc');
          expect(m.num).toBe(21);
          done();
        });
      });

      it('does not set the sourceState to LOADED when the mapper rejects the promise', function(done) {
        var m = BasicModel.get(706);
        expect(m.sourceState).toBe(Model.EMPTY);
        this.reject('error!');
        this.delay(function() {
          expect(m.sourceState).toBe(Model.EMPTY);
          done();
        });
      });

      it('sets isBusy to false when the mapper rejects the promise', function(done) {
        var m = BasicModel.get(707);
        expect(m.isBusy).toBe(true);
        this.reject('error!');
        this.delay(function() {
          expect(m.isBusy).toBe(false);
          done();
        });
      });

      it('adds an error when the mapper rejects the promise', function(done) {
        var m = BasicModel.get(708);
        this.reject({str: ['error 1', 'error 2'], num: 'error 3'});
        this.delay(function() {
          expect(m.ownErrors).toEqual({str: ['error 1', 'error 2'], num: ['error 3']});
          done();
        });
      });

      it('clears the error property when the mapper resolves the promise', function(done) {
        var m = BasicModel.get(708);
        this.reject('blah');
        this.delay(() => {
          expect(m.ownErrors.base).toEqual(['blah']);
          BasicModel.get(708);
          this.resolve({id: 708, str: 'asdf'});
          this.delay(() => {
            expect(m.ownErrors).toEqual({});
            done();
          });
        });
      });
    });
  });

  describe('#attrs', function() {
    it('returns an object containing the raw values of all attributes', function() {
      var m = new BasicModel({str: 'abc', num: 1, date: new Date(2013, 9, 26)});
      expect(m.attrs()).toEqual({str: 'abc', num: 1, strWithDefault: 'zzz', date: '2013-10-26'});

      m = new BasicModel({id: 12, str: 'abc', num: 1, strWithDefault: 'ggg', date: new Date(2013, 9, 26)});
      expect(m.attrs()).toEqual({id: 12, str: 'abc', num: 1, strWithDefault: 'ggg', date: '2013-10-26'});
    });

    it('includes the _destroy attribute when set', function() {
      var m = new BasicModel({str: 'abc', num: 1, date: new Date(2013, 9, 26), _destroy: true});
      expect(m.attrs()).toEqual({str: 'abc', num: 1, strWithDefault: 'zzz', date: '2013-10-26', _destroy: true});
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
        this.delay(() => {
          expect(this.model.isBusy).toBe(false);
          done();
        });
      });

      it('sets sourceState to LOADED when the mapper resolves the promise', function(done) {
        this.model.save();
        expect(this.model.sourceState).toBe(Model.NEW);
        this.resolve({id: 123});
        this.delay(() => {
          expect(this.model.sourceState).toBe(Model.LOADED);
          done();
        });
      });

      it('loads the resolved attributes', function(done) {
        this.model.save();
        this.resolve({id: 123, str: 'the string', num: 6});
        this.delay(() => {
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
        this.delay(() => {
          expect(this.model.sourceState).toBe(Model.NEW);
          done();
        });
      });

      it('sets isBusy to false when the mapper rejects the promise', function(done) {
        this.model.save();
        expect(this.model.isBusy).toBe(true);
        this.reject('failed');
        this.delay(() => {
          expect(this.model.isBusy).toBe(false);
          done();
        });
      });

      it('adds an error when the mapper rejects the promise', function(done) {
        this.model.save();
        this.reject('failed');
        this.delay(() => {
          expect(this.model.ownErrors.base).toEqual(['failed']);
          done();
        });
      });

      it('clears the ownErrors when the mapper resolves the promise', function(done) {
        this.model.save();
        this.reject('failed');
        this.delay(() => {
          expect(this.model.ownErrors.base).toEqual(['failed']);
          this.model.save();
          this.resolve({id: 123});
          this.delay(() => {
            expect(this.model.ownErrors).toEqual({});
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
        this.delay(() => {
          expect(this.model.isBusy).toBe(false);
          done();
        });
      });

      it('loads the resolved attributes', function(done) {
        this.model.save();
        this.resolve({id: 800, str: 'xyz', num: 14});
        this.delay(() => {
          expect(this.model.str).toBe('xyz');
          expect(this.model.num).toBe(14);
          done();
        });
      });

      it('sets isBusy to false when the mapper rejects the promise', function(done) {
        this.model.save();
        expect(this.model.isBusy).toBe(true);
        this.reject('no');
        this.delay(() => {
          expect(this.model.isBusy).toBe(false);
          done();
        });
      });

      it('adds an error when the mapper rejects the promise', function(done) {
        this.model.save();
        expect(this.model.ownErrors.base).toBeUndefined();
        this.reject({str: 'no'});
        this.delay(() => {
          expect(this.model.ownErrors.str).toEqual(['no']);
          done();
        });
      });

      it('clears the ownErrors when the mapper resolves the promise', function(done) {
        this.model.save();
        expect(this.model.ownErrors.base).toBeUndefined();
        this.reject('no');
        this.delay(() => {
          expect(this.model.ownErrors.base).toEqual(['no']);
          this.model.save();
          this.resolve({id: 800});
          this.delay(() => {
            expect(this.model.ownErrors.base).toBeUndefined();
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
        this.delay(function() {
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
      this.delay(() => {
        expect(this.model.isBusy).toBe(false);
        done();
      });
    });

    it('sets sourceState to DELETED when the mapper resolves its promise', function(done) {
      this.model.delete();
      expect(this.model.sourceState).toBe(Model.LOADED);
      this.resolve();
      this.delay(() => {
        expect(this.model.sourceState).toBe(Model.DELETED);
        done();
      });
    });

    it('removes the model from the identity map when the mapper resolves its promise', function(done) {
      this.model.delete();
      expect(BasicModel.get(this.model.id)).toBe(this.model);
      this.resolve();
      this.delay(() => {
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
      var t = p.tags.at(0);

      expect(a.posts).toEqual(A(p));
      expect(t.posts).toEqual(A(p));
      p.delete();
      this.resolve();
      this.delay(() => {
        expect(a.posts).toEqual(A());
        expect(t.posts).toEqual(A());
        done();
      });
    });

    it('sets isBusy to false when the mapper rejects its promise', function(done) {
      this.model.delete();
      expect(this.model.isBusy).toBe(true);
      this.reject();
      this.delay(() => {
        expect(this.model.isBusy).toBe(false);
        done();
      });
    });

    it('does not change the sourceState when the mapper rejects its promise', function(done) {
      this.model.delete();
      expect(this.model.sourceState).toBe(Model.LOADED);
      this.reject();
      this.delay(() => {
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
      this.delay(() => {
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
        this.delay(() => {
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
        this.delay(() => {
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
        this.delay(() => {
          expect(spy).toHaveBeenCalledWith('foo');
          done();
        });
      });

      it('invokes the rejected callback when the mapper rejects the pending promise', function(done) {
        var m = BasicModel.get(19);
        expect(m.isBusy).toBe(true);
        m.then(this.onFulfilled, this.onRejected);
        this.reject('blah');
        this.delay(() => {
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
      this.delay(() => {
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

    it('loads the existing model instead of the new model when given an id that already exists in the id map', function() {
      var a1 = Author.load({id: 12, first: 'Homer', last: 'Simpson'});
      var a2 = new Author;

      a2.load({id: 12, first: 'HOMER', last: 'SIMPSON'});

      expect(a2.isNew).toBe(true);

      expect(a1.first).toBe('HOMER');
      expect(a1.last).toBe('SIMPSON');
      expect(a1.isLoaded).toBe(true);
    });

    it('logs a warning when there is an existing model with the same id already in the id map', function() {
      var a1 = Author.load({id: 12, first: 'Homer', last: 'Simpson'});
      var a2 = new Author;

      a2.load({id: 12, first: 'HOMER', last: 'SIMPSON'});

      expect(console.warn).toHaveBeenCalledWith('Author#load: loading attributes that contain an id (12) that already exists in the identity map, the receiver will not be updated');
    });
  });

  describe('change tracking', function() {
    beforeEach(function() {
      this.company = Company.load({id: 123, name: 'Acme, Inc.'});

      this.invoice = Invoice.load({
        id: 8,
        company: 123,
        name: 'A',
        billingAddress: {id: 20, name: 'Joe Blow', address: '123 Fake St.'},
        lineItems: [
          {id: 10, name: 'foo', quantity: 10, rate: 3.5},
          {id: 11, name: 'bar', quantity: 3, rate: 12.25},
          {id: 12, name: 'baz', quantity: 8, rate: 5},
        ]
      });

      TransisObject.flush();
    });

    it('keeps track of changes to attributes in the `changes` property', function() {
      expect(this.invoice.ownChanges).toEqual({});
      this.invoice.name = 'B';
      expect(this.invoice.ownChanges).toEqual({name: 'A'});
    });

    it('does not keep track of regular prop changes', function() {
      var X = Model.extend('X', function() {
        this.prop('foo');
      });

      var x = new X;

      expect(x.ownChanges).toEqual({});
      x.foo = 9;
      expect(x.ownChanges).toEqual({});
    });

    it('notifies `ownChanges` observers when an attribute changes', function() {
      var spy = jasmine.createSpy();

      this.invoice.on('ownChanges', spy);
      this.invoice.name = 'B';
      TransisObject.flush();
      expect(spy).toHaveBeenCalledWith('ownChanges');
    });

    it('does not keep track of intermediate changes', function() {
      this.invoice.name = 'B';
      expect(this.invoice.ownChanges.name).toBe('A');
      this.invoice.name = 'C';
      expect(this.invoice.ownChanges.name).toBe('A');
    });

    it('does not add a change record if the attribute is set to an equal value', function() {
      this.invoice.name = 'A';
      expect(this.invoice.ownChanges).toEqual({});
    });

    it('clears the change when an attribute is set back to its original value', function() {
      this.invoice.name = 'B';
      expect(this.invoice.ownChanges.name).toBe('A');
      this.invoice.name = 'A';
      expect(this.invoice.ownChanges.name).toBeUndefined();
    });

    it('keeps track of changes to owned hasOne associations', function() {
      var address = this.invoice.billingAddress;

      this.invoice.billingAddress = new Address;
      expect(this.invoice.ownChanges.billingAddress).toBe(address);
    });

    it('does not keep track of changes to unowned hasOne associations', function() {
      expect(this.invoice.company).toBe(this.company);
      this.invoice.company = null;
      expect(this.invoice.ownChanges.company).toBeUndefined();
    });

    it('notifies `ownChanges` observers when an owned hasOne association changes', function() {
      var spy = jasmine.createSpy();

      this.invoice.on('ownChanges', spy);
      this.invoice.billingAddress = new Address;
      TransisObject.flush();
      expect(spy).toHaveBeenCalledWith('ownChanges');
    });

    it('keeps track of changes to owned hasMany associations when models are added', function() {
      var li1 = new LineItem, li2 = new LineItem;

      expect(this.invoice.ownChanges.lineItems).toBeUndefined();
      this.invoice.lineItems.push(li1);
      expect(this.invoice.ownChanges.lineItems).toEqual({added: [li1], removed: []});
      this.invoice.lineItems.push(li2);
      expect(this.invoice.ownChanges.lineItems).toEqual({added: [li1, li2], removed: []});
    });

    it('keeps track of changes to owned hasMany associations when elements are removed', function() {
      var li1, li2;

      expect(this.invoice.ownChanges.lineItems).toBeUndefined();
      li1 = this.invoice.lineItems.pop();
      expect(this.invoice.ownChanges.lineItems).toEqual({removed: [li1], added: []});
      li2 = this.invoice.lineItems.pop();
      expect(this.invoice.ownChanges.lineItems).toEqual({removed: [li1, li2], added: []});
    });

    it('keeps track of changes to owned hasMany associations when there are additions and removals', function() {
      var added = new LineItem, removed;

      removed = this.invoice.lineItems.shift();
      this.invoice.lineItems.push(added);
      expect(this.invoice.ownChanges.lineItems).toEqual({removed: [removed], added: [added]});
    });

    it('notifies `ownChanges` observers when an owned hasMany association is mutated', function() {
      var spy = jasmine.createSpy();

      this.invoice.on('ownChanges', spy);
      this.invoice.lineItems.pop();
      TransisObject.flush();
      expect(spy).toHaveBeenCalledWith('ownChanges');
    });

    it('keeps track of changes to owned hasMany associations when they are set', function() {
      var li1 = new LineItem, li2 = new LineItem, li3 = new LineItem,
          old = this.invoice.lineItems.slice();

      expect(this.invoice.ownChanges.lineItems).toBeUndefined();
      this.invoice.lineItems = [li1, li2];
      expect(this.invoice.ownChanges.lineItems).toEqual({added: [li1, li2], removed: old});
      this.invoice.lineItems = [li1, li2, li3];
      expect(this.invoice.ownChanges.lineItems).toEqual({added: [li1, li2, li3], removed: old});
      this.invoice.lineItems = [li1];
      expect(this.invoice.ownChanges.lineItems).toEqual({added: [li1], removed: old});
    });

    it('handles when a model is added and then removed from an owned hasMany association', function() {
      var li = new LineItem;

      this.invoice.lineItems.push(li);
      expect(this.invoice.ownChanges.lineItems).toEqual({added: [li], removed: []});
      this.invoice.lineItems.pop();
      expect(this.invoice.ownChanges.lineItems).toBeUndefined();
    })

    it('handles when a model is removed and then added to an owned hasMany association', function() {
      var li;

      li = this.invoice.lineItems.pop();
      expect(this.invoice.ownChanges.lineItems).toEqual({added: [], removed: [li]});
      this.invoice.lineItems.push(li);
      expect(this.invoice.ownChanges.lineItems).toBeUndefined();
    })

    it('clears the changes on an owned hasMany assocation when changes are manually undone', function() {
      var added = new LineItem, removed;

      removed = this.invoice.lineItems.pop();
      this.invoice.lineItems.push(added);
      expect(this.invoice.ownChanges.lineItems).toEqual({added: [added], removed: [removed]});
      this.invoice.lineItems.pop();
      this.invoice.lineItems.push(removed);
      expect(this.invoice.ownChanges.lineItems).toBeUndefined();
    });

    it('does not keep track of changes to unowned hasMany associations', function() {
      this.company.invoices.push(new Invoice);
      expect(this.company.ownChanges.invoices).toBeUndefined();
    });

    describe('#undoChanges', function() {
      it('restores the changed attributes to their original values', function() {
        this.invoice.name = 'B';
        this.invoice.undoChanges();
        expect(this.invoice.name).toBe('A');
      });

      it('restores owned hasOne associations to their original value', function() {
        var address = this.invoice.billingAddress;

        this.invoice.billingAddress = new Address;
        this.invoice.undoChanges();
        expect(this.invoice.billingAddress).toBe(address);
      });

      it('restores owned hasMany associations to their original value', function() {
        var orig   = this.invoice.lineItems.slice(),
            added1 = new LineItem,
            added2 = new LineItem,
            removed;

        removed = this.invoice.lineItems.pop();
        this.invoice.lineItems.push(added1, added2);
        this.invoice.undoChanges();
        expect(this.invoice.lineItems).toEqual(orig);
        this.invoice.lineItems.pop();
        this.invoice.lineItems.pop();
        this.invoice.undoChanges();
        expect(this.invoice.lineItems).toEqual(orig);
      });

      it('clears the `changes` objects', function() {
        this.invoice.name = 'B';
        this.invoice.billingAddress = new Address;
        this.invoice.lineItems.pop();
        this.invoice.lineItems.push(new LineItem);

        expect(Object.keys(this.invoice.ownChanges).length > 0).toBe(true);
        this.invoice.undoChanges();
        expect(this.invoice.ownChanges).toEqual({});
      });

      it('undoes changes on owned associations', function() {
        var li = this.invoice.lineItems.at(0);

        li.quantity = 11;
        this.invoice.billingAddress.name = 'Bob Smith';
        expect(li.ownChanges).toEqual({quantity: 10});
        expect(this.invoice.billingAddress.ownChanges).toEqual({name: 'Joe Blow'});
        this.invoice.undoChanges()
        expect(li.quantity).toBe(10);
        expect(this.invoice.billingAddress.name).toBe('Joe Blow');
        expect(li.ownChanges).toEqual({});
        expect(this.invoice.billingAddress.ownChanges).toEqual({});
      });

      it('does not undo changes to unowned associations', function() {
        this.invoice.company.name = 'Foobar';
        expect(this.invoice.company.ownChanges).toEqual({name: 'Acme, Inc.'});
        this.invoice.undoChanges();
        expect(this.invoice.company.ownChanges).toEqual({name: 'Acme, Inc.'});
      });

      it('does not undo changes to the owned association specified in the except option as a string', function() {
        this.invoice.billingAddress.name = 'Bob Smith';
        this.invoice.undoChanges({except: 'billingAddress'});
        expect(this.invoice.billingAddress.name).toBe('Bob Smith');
      });

      it('undoes only the assocations specified in the only option as a string', function() {
        this.invoice.lineItems.pop();
        expect(this.invoice.lineItems.length).toEqual(2);
        this.invoice.billingAddress.name = "Tom Smith";

        this.invoice.undoChanges({only: 'lineItems'});

        expect(this.invoice.billingAddress.name).toBe('Tom Smith');
        expect(this.invoice.lineItems.length).toEqual(3);
      });

      it('does not undo changes to owned associations specified in the exception option as an array', function() {
        expect(this.invoice.lineItems.length).toBe(3);
        this.invoice.lineItems.pop();
        this.invoice.undoChanges({except: ['lineItems']});
        expect(this.invoice.lineItems.length).toBe(2);
      });

      it('undoes only the assocations specified in the only option as an array', function() {
        this.invoice.lineItems.pop();
        expect(this.invoice.lineItems.length).toEqual(2);
        this.invoice.billingAddress.name = 'Tom Smith';

        this.invoice.undoChanges({only: ['lineItems']});

        expect(this.invoice.billingAddress.name).toBe('Tom Smith');
        expect(this.invoice.lineItems.length).toEqual(3);
      });

      it('re-runs validations', function() {
        this.invoice.addError('name', 'foo');
        this.invoice.undoChanges();
        expect(this.invoice.ownErrors.name).toBeUndefined();
      });

      it('handles circular owner associations', function() {
        var a = CircularA.load({id: 1, bs: [2, 3]});

        expect(function() {
          a.undoChanges();
        }).not.toThrow();
      });
    });

    describe('#hasOwnChanges', function() {
      it('returns true when the receiver has a changed property', function() {
        expect(this.invoice.hasOwnChanges).toBe(false);
        this.invoice.name = 'B';
        expect(this.invoice.hasOwnChanges).toBe(true);
      });

      it('returns true when the receiver has a mutated hasMany association', function() {
        expect(this.invoice.hasOwnChanges).toBe(false);
        this.invoice.lineItems.pop();
        expect(this.invoice.hasOwnChanges).toBe(true);
      });

      it('returns false when the receiver has no changes', function() {
        expect(this.invoice.hasOwnChanges).toBe(false);
      });

      it('returns false when an owned associated model has changes', function() {
        this.invoice.billingAddress.name = 'Bob Smith';
        expect(this.invoice.hasOwnChanges).toBe(false);
      });

      describe('observers', function() {
        beforeEach(function() {
          this.spy = jasmine.createSpy();
          this.invoice.on('hasOwnChanges', this.spy);
        });

        it('are fired when an attribute changes', function() {
          this.invoice.name = 'B';
          TransisObject.flush();
          expect(this.spy).toHaveBeenCalled();
        });

        it('are fired when an owned hasMany association is mutated', function() {
          this.invoice.lineItems.pop();
          TransisObject.flush();
          expect(this.spy).toHaveBeenCalled();
        });

        it('are not fired when an owned associated model changes', function() {
          this.invoice.billingAddress.name = 'Bob Smith';
          TransisObject.flush();
          expect(this.spy).not.toHaveBeenCalled();
        });

        it('are not fired when an unowned associated model changes', function() {
          this.invoice.company.name = 'Foo';
          TransisObject.flush();
          expect(this.spy).not.toHaveBeenCalled();
        });
      });
    });

    describe('#changes', function() {
      it('returns an object containing changes to the receiver', function() {
        this.company.name = 'Foobar';
        expect(this.company.changes).toEqual({name: 'Acme, Inc.'});
      });

      it('includes changes on owned hasOne associations', function() {
        this.invoice.billingAddress.address = '321 Maple Ave.';
        expect(this.invoice.changes).toEqual({'billingAddress.address': '123 Fake St.'});
      });

      it('does not include changes on owned hasOne associations that are destroyed', function() {
        this.invoice.billingAddress.address = '321 Maple Ave.';
        this.invoice.billingAddress._destroy = true;
        expect(this.invoice.changes).toEqual({
          'billingAddress.address': '123 Fake St.',
          'billingAddress._destroy': undefined
        });
      });

      it('does not includes changes on owned hasMany associations that are destroyed', function() {
        this.invoice.lineItems[0].name = 'FOO';
        this.invoice.lineItems[0]._destroy = true;
        expect(this.invoice.changes).toEqual({
          'lineItems.0.name': 'foo',
          'lineItems.0._destroy': undefined
        });
      });

      it('includes changes on owned hasMany associations', function() {
        this.invoice.lineItems[0].name = 'FOO';
        this.invoice.lineItems[2].name = 'BAZ';
        expect(this.invoice.changes).toEqual({
          'lineItems.0.name': 'foo',
          'lineItems.2.name': 'baz'
        });
      });

      it('does not include changes on non-owned associations', function() {
        this.invoice.company.name = 'Blah';
        expect(this.invoice.changes).toEqual({});
      });

      describe('with with circular owner associations', function() {
        beforeEach(function() {
          this.a = CircularA.load({id: 1, name: 'a1', bs: [{id: 2, name: 'b1'}]});
          this.b = this.a.bs.first;

          this.a.name = 'a2';
          this.b.name = 'b2';
        });

        it('includes changes on both sides', function() {
          expect(this.a.changes).toEqual({
            'name': 'a1',
            'bs.0.name': 'b1',
            'bs.0.as.0.name': 'a1'
          });

          expect(this.b.changes).toEqual({
            'name': 'b1',
            'as.0.name': 'a1',
            'as.0.bs.0.name': 'b1'
          });
        });
      });
    });

    describe('#hasChanges', function() {
      it('returns false for a NEW model with no attrs set', function() {
        expect((new BasicModel).hasChanges).toBe(false);
      });

      it('returns true for a NEW model with attrs set', function() {
        expect((new BasicModel({str: 'a'})).hasChanges).toBe(true);
      });

      it('returns true when the receiver has a changed property', function() {
        expect(this.invoice.hasChanges).toBe(false);
        this.invoice.name = 'B';
        expect(this.invoice.hasChanges).toBe(true);
      });

      it('returns true when the receiver has a mutated hasMany association', function() {
        expect(this.invoice.hasChanges).toBe(false);
        this.invoice.lineItems.pop();
        expect(this.invoice.hasChanges).toBe(true);
      });

      it('returns true when an owned hasOne associated model has changes', function() {
        expect(this.invoice.hasChanges).toBe(false);
        this.invoice.billingAddress.name = 'Bob Smith';
        expect(this.invoice.hasChanges).toBe(true);
      });

      it('returns true when an owned hasMany associated model has changes', function() {
        expect(this.invoice.hasChanges).toBe(false);
        this.invoice.lineItems.at(0).name = 'abc';
        expect(this.invoice.hasChanges).toBe(true);
      });

      it('returns false when the receiver and its owned associated models have no changes', function() {
        expect(this.invoice.hasChanges).toBe(false);
      });

      it('returns false when an non-owned associated model has changes', function() {
        expect(this.invoice.hasChanges).toBe(false);
        this.invoice.company.name = 'Blah';
        expect(this.invoice.hasChanges).toBe(false);
      });

      describe('with with circular owner associations', function() {
        beforeEach(function() {
          this.a = CircularA.load({id: 1, name: 'a1', bs: [{id: 2, name: 'b1'}]});
          this.b = this.a.bs.first;
        });

        it('returns false when neither side has changes', function() {
          expect(this.a.hasChanges).toBe(false);
          expect(this.b.hasChanges).toBe(false);
        });

        it('returns true for both sides when either has changes', function() {
          this.a.name = 'a2';
          expect(this.a.hasChanges).toBe(true);
          expect(this.b.hasChanges).toBe(true);
        });
      });
    });

    describe('observers for changes and hasChanges', function() {
      beforeEach(function() {
        this.changesSpy = jasmine.createSpy('changesSpy');
        this.hasChangesSpy = jasmine.createSpy('hasChanges');
        this.invoice.on('changes', this.changesSpy);
        this.invoice.on('hasChanges', this.hasChangesSpy);
      });

      it('are fired when an attribute changes', function() {
        this.invoice.name = 'B';
        TransisObject.flush();
        expect(this.changesSpy).toHaveBeenCalled();
        expect(this.hasChangesSpy).toHaveBeenCalled();
      });

      it('are fired when an owned hasMany association is mutated', function() {
        this.invoice.lineItems.pop();
        TransisObject.flush();
        expect(this.changesSpy).toHaveBeenCalled();
        expect(this.hasChangesSpy).toHaveBeenCalled();
      });

      it('are fired when an owned hasOne associated model changes', function() {
        this.invoice.billingAddress.name = 'Bob Smith';
        TransisObject.flush();
        expect(this.changesSpy).toHaveBeenCalled();
        expect(this.hasChangesSpy).toHaveBeenCalled();
      });

      it('are fired when an owned hasMany associated model changes', function() {
        this.invoice.lineItems.at(0).name = 'xyz';
        TransisObject.flush();
        expect(this.changesSpy).toHaveBeenCalled();
        expect(this.hasChangesSpy).toHaveBeenCalled();
      });

      it('are not fired when an unowned associated model changes', function() {
        this.invoice.company.name = 'Foo';
        TransisObject.flush();
        expect(this.changesSpy).not.toHaveBeenCalled();
        expect(this.hasChangesSpy).not.toHaveBeenCalled();
      });
    });

    describe('#previousValueFor', function() {
      it('returns undefined with the given attribute has not changed', function() {
        expect(this.invoice.previousValueFor('name')).toBeUndefined();
      });

      it('returns the previous value for attributes that have changed', function() {
        this.invoice.name = 'B';
        expect(this.invoice.previousValueFor('name')).toBe('A');
      });

      it('returns the previous value of hasOne associations', function() {
        var address = this.invoice.billingAddress;
        this.invoice.billingAddress = new Address;
        expect(this.invoice.previousValueFor('billingAddress')).toBe(address);
      });

      it('returns an array of the previous contents of a hasMany association', function() {
        var lis = this.invoice.lineItems.slice();
        this.invoice.lineItems.pop();
        this.invoice.lineItems.pop();
        expect(this.invoice.previousValueFor('lineItems')).toEqual(lis);
      });
    });
  });

  describe('validations', function() {
    var ValidatedFoo = Model.extend('ValidatedFoo', function() {
      this.attr('name', 'string')
      this.attr('withoutContext', 'number');
      this.attr('num', 'number');
      this.attr('notValidated', 'number');

      this.validate('withoutContext', function() {
        if(this.withoutContext && this.withoutContext > 10) {
          this.addError('withoutContext', 'maximum value exceeded')
        }
      });
      this.validate('name', 'nameIsLowerCase');
      this.validate('name', function() {
        if (this.name && this.name.length >= 10) {
          this.addError('name', 'must be less than 10 characters');
        }
      });

      this.validate('name', function() {
          if(this.name && this.name.length <= 5) {
            this.addError('name', 'must be greater than 5 characters');
          }
        }, {on: 'nameContext'});

      this.validate('name', function() {
          if(this.name && this.name.length <= 5) {
            this.addError('name', 'error not used');
          }
        }, {on: 'contextNotUsed'});

      this.validate('num', function() {
          if(this.num > 10) {
            this.addError('num', 'exceeds maximum value for num')
          }
      }, {on: 'maxNumContext'});

      this.validate('num', 'numIsInteger');

      this.hasMany('bars', 'ValidatedBar', {owner: true});

      this.prototype.nameIsLowerCase = function() {
        if (this.name && this.name.toLowerCase() !== this.name) {
          this.addError('name', 'must be lower case');
        }
      };

      this.prototype.numIsInteger = function() {
        if (!String(this.num).match(/^\d+$/)) {
          this.addError('num', 'is not an integer');
        }
      };
    });

    var ValidatedBar = Model.extend('ValidatedBar', function() {
      this.attr('x', 'number');

      this.validate('x', function() {
        if (this.x && this.x % 2 !== 0) {
          this.addError('x', 'must be even');
        }
      });

      this.validate('x', function() {
          if(this.x > 10) {
            this.addError('x', 'exceeds maximum value for x')
          }
      }, {on: 'maxNumContext'});
    });

    beforeEach(function() {
      this.company = Company.load({id: 123, name: 'Acme, Inc.'});

      this.invoice = Invoice.load({
        id: 8,
        company: 123,
        name: 'A',
        billingAddress: {id: 20, name: 'Joe Blow', address: '123 Fake St.'},
        lineItems: [
          {id: 10, name: 'foo', quantity: 10, rate: 3.5},
          {id: 11, name: 'bar', quantity: 3, rate: 12.25},
          {id: 12, name: 'baz', quantity: 8, rate: 5},
        ]
      });

      TransisObject.flush();
    });

    describe('#addError', function() {
      beforeEach(function() {
        this.m = new BasicModel;
      });

      it('adds the given mesage to the `ownErrors` hash for the given name', function() {
        expect(this.m.ownErrors.str).toBeUndefined();
        this.m.addError('str', 'foo');
        expect(this.m.ownErrors.str).toEqual(['foo']);
      });

      it('adds to the ownErrors array when a validation error already exists for the given name', function() {
        this.m.addError('str', 'foo');
        expect(this.m.ownErrors.str).toEqual(['foo']);
        this.m.addError('str', 'bar');
        expect(this.m.ownErrors.str).toEqual(['foo', 'bar']);
      });

      it('does not add identical error messages', function() {
        this.m.addError('str', 'foo');
        expect(this.m.ownErrors.str).toEqual(['foo']);
        this.m.addError('str', 'foo');
        expect(this.m.ownErrors.str).toEqual(['foo']);
      });

      it('notifies `ownErrors` observers', function() {
        var spy = jasmine.createSpy();
        this.m.on('ownErrors', spy);
        this.m.addError('str', 'foo');
        TransisObject.flush();
        expect(spy).toHaveBeenCalledWith('ownErrors');
      });
    });

    describe('#hasOwnErrors', function() {
      it('returns true when the receiver has a validation error on one of its properties', function() {
        expect(this.invoice.hasOwnErrors).toBe(false);
        this.invoice.addError('name', 'foo');
        expect(this.invoice.hasOwnErrors).toBe(true);
      });

      it('returns false when the receiver has no validation errors on any of its properties', function() {
        expect(this.invoice.hasOwnErrors).toBe(false);
      });

      it('returns false when an owned associated model has errors', function() {
        this.invoice.billingAddress.addError('name', 'bar');
        expect(this.invoice.hasOwnErrors).toBe(false);
      });

      it('returns false when the _destroy attr is set', function() {
        this.invoice.addError('name', 'foo');
        expect(this.invoice.hasOwnErrors).toBe(true);
        this.invoice._destroy = true;
        expect(this.invoice.hasOwnErrors).toBe(false);
      });

      it('returns true when there are validation errors and _destroy is unset', function() {
        this.invoice.addError('name', 'foo');
        this.invoice._destroy = true;
        expect(this.invoice.hasOwnErrors).toBe(false);
        this.invoice._destroy = false;
        expect(this.invoice.hasOwnErrors).toBe(true);
      });

      describe('observers', function() {
        beforeEach(function() {
          this.spy = jasmine.createSpy();
          this.invoice.on('hasOwnErrors', this.spy);
        });

        it('are fired when a validation error is added', function() {
          this.invoice.addError('name', 'x');
          TransisObject.flush();
          expect(this.spy).toHaveBeenCalled();
        });

        it('are fired when _destroy is changed', function() {
          this.invoice.addError('name', 'x');
          TransisObject.flush();
          expect(this.spy.calls.count()).toBe(1);
          this.invoice._destroy = true
          TransisObject.flush();
          expect(this.spy.calls.count()).toBe(2);
        });

        it('are not fired when an owned associated model has a validation error added', function() {
          this.invoice.billingAddress.addError('name', 'y');
          TransisObject.flush();
          expect(this.spy).not.toHaveBeenCalled();
        });

        it('are not fired when an unowned associated model has a validation error added', function() {
          this.invoice.company.addError('name', 'z');
          TransisObject.flush();
          expect(this.spy).not.toHaveBeenCalled();
        });
      });
    });

    describe('#errors', function() {
      it('returns an object with the receivers own errors', function() {
        this.invoice.addError('name', 'foo');
        expect(this.invoice.errors).toEqual({name: ['foo']});
      });

      it('includes errors on owned hasOne associations', function() {
        this.invoice.billingAddress.addError('address', 'bar');
        expect(this.invoice.errors).toEqual({'billingAddress.address': ['bar']});
      });

      it('does not includes errors on owned hasOne associations that are destroyed', function() {
        this.invoice.billingAddress.addError('address', 'bar');
        this.invoice.billingAddress._destroy = true;
        expect(this.invoice.errors).toEqual({});
      });

      it('includes errors on owned hasMany associations', function() {
        this.invoice.lineItems[0].addError('name', 'a');
        this.invoice.lineItems[2].addError('name', 'b');
        expect(this.invoice.errors).toEqual({
          'lineItems.0.name': ['a'],
          'lineItems.2.name': ['b']
        });
      });

      it('does not include errors on owned hasMany associations that are destroyed', function() {
        this.invoice.lineItems[0].addError('name', 'a');
        this.invoice.lineItems[0]._destroy = true
        expect(this.invoice.errors).toEqual({});
      });

      it('does not include errors on non-owned associations', function() {
        this.invoice.company.addError('name', 'blah');
        expect(this.invoice.errors).toEqual({});
      });

      describe('with with circular owner associations', function() {
        beforeEach(function() {
          this.a = CircularA.load({id: 1, name: 'a1', bs: [{id: 2, name: 'b1'}]});
          this.b = this.a.bs.first;

          this.a.addError('name', 'foo');
          this.b.addError('name', 'bar');
        });

        it('includes errors on both sides', function() {
          expect(this.a.errors).toEqual({
            'name': ['foo'],
            'bs.0.name': ['bar'],
            'bs.0.as.0.name': ['foo']
          });

          expect(this.b.errors).toEqual({
            'name': ['bar'],
            'as.0.name': ['foo'],
            'as.0.bs.0.name': ['bar']
          });
        });
      });
    });

    describe('#hasErrors', function() {
      it('returns true when the receiver has a validation error on one of its properties', function() {
        expect(this.invoice.hasErrors).toBe(false);
        this.invoice.addError('name', 'foo');
        expect(this.invoice.hasErrors).toBe(true);
      });

      it('returns true when the recevier has an owned hasOne associated model with a validation error', function() {
        expect(this.invoice.hasErrors).toBe(false);
        this.invoice.billingAddress.addError('name', 'bar');
        expect(this.invoice.hasErrors).toBe(true);
      });

      it('returns true when the receiver has an owned hasMany associated model with a validation error', function() {
        expect(this.invoice.hasErrors).toBe(false);
        this.invoice.lineItems.at(0).addError('name', 'baz');
        expect(this.invoice.hasErrors).toBe(true);
      });

      it('returns false when the receiver and its owned associated models have no validation errors', function() {
        expect(this.invoice.hasErrors).toBe(false);
      });

      it('returns false when a non-owned associated model has validation errors', function() {
        expect(this.invoice.hasErrors).toBe(false);
        this.invoice.company.addError('name', 'abc');
        expect(this.invoice.hasErrors).toBe(false);
      });

      describe('with with circular owner associations', function() {
        beforeEach(function() {
          this.a = CircularA.load({id: 1, name: 'a1', bs: [{id: 2, name: 'b1'}]});
          this.b = this.a.bs.first;
        });

        it('returns false when neither side has errors', function() {
          expect(this.a.hasErrors).toBe(false);
          expect(this.b.hasErrors).toBe(false);
        });

        it('returns true for both sides when either has an error', function() {
          this.a.addError('name', 'foo');
          expect(this.a.hasErrors).toBe(true);
          expect(this.b.hasErrors).toBe(true);
        });
      });
    });

    describe('observers for errors and hasError', function() {
      beforeEach(function() {
        this.errorsSpy = jasmine.createSpy('errors');
        this.hasErrorsSpy = jasmine.createSpy('hasErrors');
        this.invoice.on('errors', this.errorsSpy);
        this.invoice.on('hasErrors', this.hasErrorsSpy);
      });

      it('are fired when a validation error is added', function() {
        this.invoice.addError('name', 'x');
        TransisObject.flush();
        expect(this.errorsSpy).toHaveBeenCalled();
        expect(this.hasErrorsSpy).toHaveBeenCalled();
      });

      it('are fired when an owned associated model has a validation error added', function() {
        this.invoice.billingAddress.addError('name', 'y');
        TransisObject.flush();
        expect(this.errorsSpy).toHaveBeenCalled();
        expect(this.hasErrorsSpy).toHaveBeenCalled();
      });

      it('are not fired when an unowned associated model has a validation error added', function() {
        this.invoice.company.addError('name', 'z');
        TransisObject.flush();
        expect(this.errorsSpy).not.toHaveBeenCalled();
        expect(this.hasErrorsSpy).not.toHaveBeenCalled();
      });
    });

    describe('#validateAttr', function() {
      it('runs all registered validators for the given property name', function() {
        var m = new ValidatedFoo({name: 'FooBarBazQuux'});
        m.validateAttr('name');
        expect(m.ownErrors.name).toEqual(['must be lower case', 'must be less than 10 characters']);
      });

      it('clears existing validation errors on the given property name', function() {
        var m = new ValidatedFoo({name: 'Foo'});
        m.addError('name', 'abc');
        expect(m.ownErrors.name).toEqual(['abc']);
        m.validateAttr('name');
        expect(m.ownErrors.name).toEqual(['must be lower case']);
      });

      it('clears existing validation errors for the given property name even when there are no registered validators', function() {
        var m = new ValidatedFoo;

        m.addError('notValidated', 'foobar');
        m.validateAttr('notValidated');
        expect(m.ownErrors.notValidated).toBeUndefined();
      });

      it('does not clear existing validation errors on other properties', function() {
        var m = new ValidatedFoo({name: 'Foo'});
        m.addError('num', 'xyz');
        expect(m.ownErrors.num).toEqual(['xyz']);
        m.validateAttr('name');
        expect(m.ownErrors.num).toEqual(['xyz']);
      });

      it('returns true when all validations pass', function() {
        var m = new ValidatedFoo({name: 'foo'});
        expect(m.validateAttr('name')).toBe(true);
      });

      it('returns false when some validation fails', function() {
        var m = new ValidatedFoo({name: 'Foo'});
        expect(m.validateAttr('name')).toBe(false);
      });


      describe('given a context', function() {
        var contains = function(array, value) { return array.indexOf(value) >= 0 }

        it('runs only validators for the given property name that include the context', function() {
          var m = new ValidatedFoo({name: 'FOO', num: 34.3});
          m.validateAttr('name', 'nameContext');
          expect( contains(m.ownErrors.name, 'must be greater than 5 characters') ).toBe(true);
        });

        it('runs validators for same attribute that do not have a context', function() {
          var m = new ValidatedFoo({name: 'FOO'});
          m.validateAttr('name', 'nameContext');
          expect( contains(m.ownErrors.name, 'must be lower case') ).toBe(true);
        });

        it('clears existing validation errors on the given property name', function() {
          var m = new ValidatedFoo({name: 'FOO'});
          m.addError('name', 'abc');
          expect(m.ownErrors.name).toEqual(['abc']);
          m.validateAttr('name', 'nameContext');
          expect(m.ownErrors.name).toEqual(['must be lower case', 'must be greater than 5 characters']);
        });

        it('returns false when some validation fails', function() {
          var m = new ValidatedFoo({name: 'Foo'});
          expect(m.validateAttr('name', 'nameContext')).toBe(false);
        });

        it('returns true when all validations pass', function() {
          var m = new ValidatedFoo({name: 'foobar'});
          expect(m.validateAttr('name', 'nameContext')).toBe(true);
        });
      });

    });

    describe('#validate', function() {
      it('runs validators for all properties', function() {
        var m = new ValidatedFoo({name: 'Foo', num: 3.14});

        expect(m.ownErrors).toEqual({});
        m.validate();
        expect(m.ownErrors).toEqual({name: ['must be lower case'], num: ['is not an integer']});
      });

      it('runs only validators for the given context on owned associated models', function() {
        var m = new ValidatedFoo({num: 15, bars: [new ValidatedBar({x: 15})]});
        expect(m.bars.at(0).ownErrors).toEqual({});
        expect(m.ownErrors).toEqual({});
        m.validate('maxNumContext');
        expect(m.bars.at(0).ownErrors).toEqual({x: ['must be even', 'exceeds maximum value for x']});
        expect(m.ownErrors).toEqual({num: ['exceeds maximum value for num']});
      });

      it('runs validate on owned associated models', function() {
        var m = new ValidatedFoo({name: 'foo', num: 10, bars: [new ValidatedBar({x: 3})]});

        expect(m.bars.at(0).ownErrors).toEqual({});
        m.validate();
        expect(m.bars.at(0).ownErrors).toEqual({x: ['must be even']});
      });

      it('does not run validate on owned associated models that are marked for destruction', function() {
        var m = new ValidatedFoo({
          name: 'foo', num: 10, bars: [new ValidatedBar({_destroy: true})]
        });

        spyOn(m.bars.first, 'validate');
        m.validate();
        expect(m.bars.first.validate).not.toHaveBeenCalled();
      });

      it('returns true when no validation errors are found', function() {
        var m = new ValidatedFoo({name: 'foo', num: 10});
        expect(m.validate()).toBe(true);
      });

      it('returns false when a validation error is found on the receiver', function() {
        var m = new ValidatedFoo({name: 'Foo', num: 10});
        expect(m.validate()).toBe(false);
      });

      it('returns false when a validation error is found on an owned associated model', function() {
        var m = new ValidatedFoo({name: 'foo', num: 10, bars: [new ValidatedBar({x: 2}), new ValidatedBar({x: 3})]});
        expect(m.validate()).toBe(false);
      });

      it('clears errors for non-validated properties', function() {
        var m = new ValidatedFoo;

        m.addError('notValidated', 'foobar');
        m.validate();
        expect(m.ownErrors.notValidated).toBeUndefined();
      });

      it('handles circular owner associations', function() {
        var a = CircularA.load({id: 1, bs: [2, 3]});

        expect(function() {
          a.validate();
        }).not.toThrow();
      });

      describe('based on context', function() {
        it('runs only validators for the given context', function() {
          var m = new ValidatedFoo({name: 'Foo', num: 3.4});
          expect(m.ownErrors).toEqual({});
          m.validate('nameContext');
          expect(m.ownErrors).toEqual({name: ['must be lower case', 'must be greater than 5 characters'], num: ['is not an integer']});
        });

        it('runs all other validations without a context', function() {
          var m = new ValidatedFoo({name: 'Foo', withoutContext: 20, num: 1});
          expect(m.ownErrors).toEqual({});
          m.validate('nameContext');
          expect(m.ownErrors).toEqual({
            name: ['must be lower case', 'must be greater than 5 characters'],
            withoutContext: ['maximum value exceeded']
          });
        });

        it('does not run validate on owned associated models that are marked for destruction', function() {
          var m = new ValidatedFoo({
            name: 'foo', num: 10, bars: [new ValidatedBar({_destroy: true, x: 'foo'})]
          });
          spyOn(m.bars.first, 'validate');
          m.validate('maxNumContext');
          expect(m.bars.first.validate).not.toHaveBeenCalled();
        });

        it('returns true when no validation errors are found', function() {
          var m = new ValidatedFoo({name: 'foofoo', num: 10});
          expect(m.validate('nameContext')).toBe(true);
        });

        it('returns false when a validation error is found on the receiver', function() {
          var m = new ValidatedFoo({name: 'Foo', num: 10});
          expect(m.validate('nameContext')).toBe(false);
        });

        it('returns false when a validation error is found on an owned associated model', function() {
          var m = new ValidatedFoo({name: 'foo', num: 10, bars: [new ValidatedBar({x: 2}), new ValidatedBar({x: 19})]});
          expect(m.validate('maxNumContext')).toBe(false);
        });

        it('errors are cleaed for non-validated properties', function() {
          var m = new ValidatedFoo;

          m.addError('notValidated', 'foobar');
          m.validate('nameContext');
          expect(m.ownErrors.notValidated).toBeUndefined();
        });
      });
    });
  });

  describe('promise/observer callback ordering', function() {
    it('executes promise callbacks before observer callbacks', function(done) {
      spyOn(BasicModel.mapper, 'get').and.callFake(function() {
        return new Promise(function(resolve) {
          setTimeout(function() { resolve({id: 1, str: 'a'}); }, 1);
        });
      });

      var calls = [];
      var m = BasicModel.get(1);

      m.on('str', function() { calls.push('observer'); });
      m.then(function() { calls.push('promise'); });

      setTimeout(function() {
        expect(calls).toEqual(['promise', 'observer']);
        done();
      }, 100);
    });
  });

  describe('subclassing', function() {
    var Parent = Model.extend('Parent', function() {
      this.getSubclass = function(attrs) {
        return attrs.type;
      };
    });

    var Child = Parent.extend('Child');
    var AnotherChild = Parent.extend('AnotherChild');

    var Composition = Model.extend('Composition', function() {
      this.hasMany('things', 'Parent');
    });

    describe('.resolveSubclass', function() {
      it('can resolve subclases', function() {
        var subclass = Parent.resolveSubclass('Child');
        expect(subclass).toBe(Child);
      });

      it('throws an exception when there are no subclasses', function() {
        expect(()=> Child.resolveSubclass('Grandchild'))
          .toThrow(new Error('Child.resolveSubclass: could not find subclass Grandchild'));
      });

      it('throws an exception when the subclasses could not be found', function() {
        expect(()=> Parent.resolveSubclass('SomethingElse'))
          .toThrow(new Error('Parent.resolveSubclass: could not find subclass SomethingElse'));
      });
    });

    describe('loading subclasses', function() {
      it('returns an instance of appropriate subclass', function() {
        var loaded = Parent.load({id: 1, type: 'Child'});
        expect(loaded instanceof Child).toBe(true);
      });

      it('loads associated subclasses', function() {
        var loaded = Composition.load({
          id: 1,
          things: [
            {
              id: 'thing1',
              type: 'Child'
            },
            {
              id: 'thing2',
              type: 'AnotherChild'
            }
          ]
        });

        expect(loaded.things[0] instanceof Child).toBe(true);
        expect(loaded.things[1] instanceof AnotherChild).toBe(true);
      });

      it('rejects non subclasses', function() {
        expect(()=> {
          Composition.load({
            id: 2,
            things: [
              {
                id: 'randomThing1',
                type: 'SomethingElse'
              }
            ]
          });
        }).toThrow();
      })
    });
  });

  describe('instrument', function() {
    beforeEach(function() {
      this.post = new Post;
    });

    afterEach(function() {
      Model.instrument.stop();
    });

    describe('start', function() {
      beforeEach(function() {
        Model.instrument.start();
      });

      it('records attr gets', function() {
        this.post.title;
        this.post.title;
        this.post.body;
        this.post.body;
        this.post.body;
        expect(Model.instrument.getLast().attrs['Post#title']).toBe(2);
        expect(Model.instrument.getLast().attrs['Post#body']).toBe(3);
      });

      it('records hasOne gets', function() {
        this.post.author;
        this.post.author;
        this.post.author;
        this.post.author;
        expect(Model.instrument.getLast().associations['Post#author']).toBe(4);
      });

      it('records hasMany gets', function() {
        this.post.tags;
        this.post.tags;
        expect(Model.instrument.getLast().associations['Post#tags']).toBe(2);
      });
    });

    describe('stop', function() {
      beforeEach(function() {
        Model.instrument.start();
        this.post.title;
        this.post.body;
        Model.instrument.stop();
      });

      it('stops recording get', function() {
        expect(Model.instrument.getLast().attrs['Post#title']).toBe(1);
        expect(Model.instrument.getLast().attrs['Post#body']).toBe(1);
        this.post.title;
        this.post.title;
        this.post.body;
        this.post.body;
        expect(Model.instrument.getLast().attrs['Post#title']).toBe(1);
        expect(Model.instrument.getLast().attrs['Post#body']).toBe(1);
      });
    });
  });
});
