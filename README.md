# Basis

Basis is a javascript data modeling library for use in single page web applications. It provides
the following features:

* two-way associations
* identity map
* separation of business logic from persistence logic via the data mapper pattern
* ability to easily load nested models from a complex JSON object (see `Basis.Model.load`)
* typed attributes with coercion
* model state management (empty, new, loaded, busy, etc.)
* attribute change tracking with undo functionality
* property observation of both simple and computed properties
* automatic computed property caching

## Dependencies

Basis has no dependencies other than some ES6 features that are not yet available in all browsers.
Its advised to use [es6-shim][es6-shim] until browser support improves.

## Feature Breakdown

Below is a walkthrough of the main `Basis` features.

### Object system

`Basis` provides a basic object system that works on top of constructor functions and the `new`
operator. New classes are created by calling the `extend` method on `Basis.Object` and passing it a
function that represents the "class body". The `extend` method returns a regular constructor
function that can be instantiated with the `new` operator. Inside the class body function you can
define both static and instance properties and methods. To add an initializer, simply define the
`init` method, any arguments passed to the constructor function will be forwarded on to it.

The `extend` method sets up the prototype chain so that instance level inheritance works as
expected. It also copies static properties from the superclass to the subclass.

```javascript
var Shape = Basis.Object.extend(function() {
  this.prototype.area = function() {
    return 0;
  };

  this.prototype.perimeter = function() {
    return 0;
  };
});

var Rectangle = Shape.extend(function() {
  this.prototype.init = function(length, width) {
    this.length = length;
    this.width = width;
  };

  this.prototype.area = function() {
    return this.length * this.width;
  };

  this.prototype.perimeter = function() {
    return 2 * (this.length + this.width);
  };
});

var Circle = Shape.extend(function() {
  this.PI = Math.PI;

  this.prototype.init = function(radius = 0) {
    this.radius = radius;
  };

  this.prototype.area = function() {
    return this.constructor.PI * this.radius * this.radius;
  };

  this.prototype.perimeter = function() {
    return 2 * this.constructor.PI * this.radius;
  };
});

var Square = Rectangle.extend(function() {
  this.prototype.init = function(side) {
    return Square.__super__.init.call(this, side, side);
  };
});

var r = new Rectangle(4, 3);
var s = new Square(5);
var c = new Circle(9);
console.log('r area:', r.area()); // r area: 12
console.log('r perimeter:', r.perimeter()); // r perimeter: 14
console.log('s area:', s.area()); // s area: 25
console.log('s perimeter:', s.perimeter()); // s perimeter: 20
console.log('c area:', c.area()); // c area: 254.46900494077323
console.log('c perimeter:', c.perimeter()); // c perimeter: 56.548667764616276
```

### Properties

The other main feature of `Basis.Object` is observable properties. Properties, or "props" to
distinguish them from normal javascript object properties, are defined with the `Basis.Object.prop`
method. The simplest prop is just defined with a name and can be get and set just like any other
javascript property:

```javascript
var Person = Basis.Object.extend(function() {
  this.prop('firstName');
  this.prop('lastName');
});

var p = new Person({firstName: 'John', lastName: 'Doe'});
console.log(p.firstName);
// John
console.log(p.lastName);
// Doe
p.firstName = 'Jane';
console.log(p.firstName);
// Jane
console.log(p.lastName);
// Doe
```

As you can see above, the default `Basis.Object` constructor takes an object mapping prop keys to
values. Any key in the given object that matches a defined prop will be set by the constructor.

What sets props apart from normal javascript properties is their ability to be observed. Observers
can be attached using the `Basis.Object#on` method:

```javascript
console.log(p.firstName);
// Jane
p.on('firstName', function() { console.log('firstName changed'); });
p.firstName = 'Bob';
// firstName changed
```

The `#on` method is very simple, it just takes a prop name and a callback function. To remove an
observer, use the `Basis.Object#off` method and pass it the same arguments passed to `#on`.

Basis props can be much more sophisticated than the example above - you can specify custom getter
and setter functions to be invoked whenever the prop is read or written. Under the hood the `prop`
method is using [`Object.defineProperty`][Object.defineProperty].

```javascript
var Doubler = Basis.Object.extend(function() {
  this.prop('value');
  this.prop('doubledValue', {
    get: function() {
      return this.value * 2;
    },
    set: function(doubledValue) {
      this.value = doubledValue / 2;
    }
  });
});

var doubler = new Doubler({value: 3});
console.log(doubler.value);
// 3
console.log(doubler.doubledValue);
// 6
doubler.doubledValue = 18;
console.log(doubler.value);
// 9
console.log(doubler.doubledValue);
// 18
```

And even with a custom getter function, the prop is still observable:

```javascript
doubler.on('doubledValue', function() { console.log('doubledValue changed:', doubler.doubledValue); });
doubler.doubledValue = 22;
// doubledValue changed: 22
```

There is a problem with the above `Doubler` example however. If we set the `value` prop, that
effectively updates the `doubledValue` prop, but any observers on `doubledValue` won't get notified.
This is because we haven't informed Basis that the `doubledValue` prop actually depends on the
`value` prop. We can do that by using the `on` option to the `prop` method. Simply pass it a list of
prop names that the prop you are defining depends on:

```javascript
var Doubler2 = Basis.Object.extend(function() {
  this.prop('value');
  this.prop('doubledValue', {
    on: ['value'],
    get: function(value) {
      return value * 2;
    }
  });
});

var doubler2 = new Doubler2({value: 4});
console.log(doubler2.value);
// 4
console.log(doubler2.doubledValue);
// 8
doubler2.on('doubledValue', function() { console.log('doubledValue changed:', doubler2.doubledValue); });
doubler2.value = 5;
// doubledValue changed: 10
```

Now, our observer on the `doubledValue` prop gets notified when we change the `value` prop. This is
how you define observable computed properties in Basis.

One thing you may have noticed in the `Doubler2` example is that the `doubledValue` getter function
takes an argument and does not access `this`. This is what is known as a "pure" prop and is the
default when you define a custom getter function on your prop without also defining a custom setter.
A pure prop is called as such because its getter function must be a pure function, meaning it has no
side effects. This is enforced by Basis by invoking the getter function in the `null` context,
meaning `this` will be `null` inside the body of the function. So if you can't access `this`, how do
you access the dependent props? This is where the `on` option comes in. You must declare all
dependencies using the `on` option and Basis will take care of accessing them and passing them to
your getter function in the same order they are named in the `on` option.

If you must access `this` inside your getter, you can make your prop "impure" by setting the `pure`
option to false. In this case, no arguments will be passed to your getter function, even if you have
declared dependencies with the `on` option.

### Model layer

The `Basis.Object` class is the foundation of Basis, but you will likely rarely use it directly in
a user interface application to define your model objects. Instead you will use `Basis.Model` which
is a subclass of `Basis.Object` and therefore inherits its ability to define observable props.

`Basis.Model` builds on `Basis.Object` by adding an identity map, typed attributes, two-way
associations, a thin persistence layer, state management, change tracking, and validations. Each of
these features will be explored next.

### Identity map

`Basis.Model` makes use of an [identity map][identity map] to ensure that each model instance gets
loaded only once into memory. A model instance is uniquely identified by its class and `id` prop.

This is important for user interface applications because things can quickly get out of hand if we
allow for having multiple objects that all represent the same thing. If you update one object but
have another object that represents the same thing bound to a view, the view won't update because
its version of the object wasn't actually changed.

### Typed attributes

`Basis.Model` introduces a new way to define typed props, otherwise known as attributes with the
`Basis.Model.attr` method. Attributes are special Basis props that ensure their value is of a
particular type. This is really helpful when dealing with JSON APIs where the amount of data types
is fairly limited. For example, JSON doesn't support a Date data type, but Basis provides a date
attribute type that will automatically parse [ISO 8601][ISO 8601] formatted date strings and turn
them into javascript [`Date`][Date] objects.

Basis supports the following attribute types:

* identity (no coercion is performed)
* string
* integer
* number
* boolean
* date
* datetime

Additionally, you can register your own custom attribute types using the `Basis.Model.registerAttr`
method.

Here is an example of attributes in action:

```javascript
var Person = Basis.Model.extend('Person', function() {
  this.attr('firstName', 'string');
  this.attr('lastName', 'string');
  this.attr('birthday', 'date');
  this.attr('numberOfPets', 'integer');
});

var p = new Person({firstName: 'Joe', lastName: 'Blow', birthday: '1970-01-01', numberOfPets: '3'});
console.log(p.firstName);
// Joe
console.log(p.lastName);
// Blow
console.log(p.birthday);
// Thu Jan 01 1970 00:00:00 GMT-0600 (CST)
console.log(p.numberOfPets);
// 3
console.log(p.birthday instanceof Date);
// true
console.log(typeof p.numberOfPets);
// number
```

The `firstName` and `lastName` attrs are pretty straightforward, but you can see the attribute
coercion in action with the `birthday` and `numberOfPets` props. We set both of those values to
strings but the `birthday` attr is parsed into a `Date` object and the `numberOfPets` attr is parsed
into a number.

Also take note of the way we're calling `extend` here as its slightly different than calling `extend`
directly on `Basis.Object`. When extending `Basis.Model` you must pass a string representing the
class name as the first argument. This class name is used when defining assocations, which we'll
take a look at next.

### Two-way associations

All but the most trival data models have relationships among models. Basis helps model these
relationships with associations. Assocations come in two flavors: a to-one relation or to-many
relationship. When the association is defined on both sides of the relationship, the association is
said to be two-way, meaning that manipulating one side of the association also manipulates the other
side. For example, if an `Author` model has many `Book`s, and we add a book to an author's `books`
association, that book will automatically have its `author` prop set. The reverse is true as well,
if a book's `author` property is set, then that book instance gets added to the author's `books`
association.

Associations between models are defined using the `Basis.Model.hasOne` and `Basis.Model.hasMany`
methods. These generate special props, which of course are observable.

```javascript
var Author = Basis.Model.extend('Author', function() {
  this.attr('name', 'string');
  this.hasMany('books', 'Book', {inverse: 'author'});
});

var Book = Basis.Model.extend('Book', function() {
  this.attr('title', 'string');
  this.hasOne('author', 'Author', {inverse: 'books'});
});

var a = new Author({
  name: 'George R. R. Martin',
  books: [
    new Book({title: 'A Game of Thrones'}),
    new Book({title: 'A Storm of Swords'})
  ]
});

console.log(a.books.toString());
// [#<Book (NEW):1 {"title":"A Game of Thrones"}>, #<Book (NEW):2 {"title":"A Storm of Swords"}>]
console.log(a.books[0].author.toString());
// #<Author (NEW):3 {"name":"George R. R. Martin"}>
console.log(a.books[1].author.toString());
// #<Author (NEW):3 {"name":"George R. R. Martin"}>

var book = a.books.pop();
console.log(a.books.toString());
// [#<Book (NEW):1 {"title":"A Game of Thrones"}>]
console.log(book.author);
// undefined
```

First observe how associations are defined. You call either the `.hasOne` or `.hasMany` method and
pass it the name of the association, the name of the associated model (this must be the same string
passed to  `Basis.Model.extend`), and an options hash. This will add a new prop to the class. For
`hasOne` associations the value of that prop is either `undefined` or an instance of the associated
model class. For `hasMany` associations, the value is always an array containing zero or more
instances of the associated model class.

Next you can see the two-way associations in action. The `inverse` option on both sides must be set
in order for the association to be two way. This is how Basis figures out the prop to update on the
other side when an assocation is changed.

At this point you may be wondering how popping an item from the `Author#books` array causes the
book's `author` prop to be updated. It works because Basis `hasMany` associations don't use regular
native array objects, they instead use `Basis.Array` objects. Lets take a brief interlue from
discussing `Basis.Model` to take a look at `Basis.Array`.

### `Basis.Array`

The `Basis.Array` class implements an observable native-like array. It behaves just like a native
array except that it has some enhanced capabilities. An example best illustrates this:

```javascript
var a1 = Basis.Array.of(1,2,3);
var a2 = Basis.Array.from([4,5,6]);

console.log(a1.toString());
// [1, 2, 3]
console.log(a2.toString());
// [4, 5, 6]

console.log(a1.size);
// 3
a1.on('size', function() { console.log('a1 size changed:', a1.size); });
a1.push(10);
Basis.Object.flush();
// a1 size changed: 4
a1.shift();
Basis.Object.flush();
// a1 size changed: 3

a2.on('@', function() { console.log('a2 was mutated:', a2.toString()); });
a2.pop();
Basis.Object.flush();
// a2 was mutated: [4, 5]
a2.at(0, 10);
Basis.Object.flush();
// a2 was mutated: [10, 5]
```

First we see two ways to instantiate a new `Basis.Array`. The first, using the `.of` method, returns
a new `Basis.Array` containing each argument. This is analogous to using the brackets operator
(`[]`) to create a native array. The second, using the `.from` method, converts a native array
or array-like object to a `Basis.Array`.

From there we can see that `Basis.Array` objects have a `size` prop that is observable. When a new
item is pushed on to the array or shifted off, observers of the `size` prop are notified.

Lastly we can see that `Basis.Array` objects have another observable prop named `@`. This is a
special prop used to observe mutations made to the array. Any operation that changes the contents of
the array in any way will notify observers of the `@` prop.

The `Basis.Array` class has an interesting implementation. It does not truly subclass
`Basis.Object`. You can see this by using the `instanceof` operator:

```javascript
var a = Basis.Array.of();
console.log(a instanceof Basis.Array);
// true
console.log(a instanceof Basis.Object);
// false
```

However, it behaves just like a `Basis.Object`. It is assigned an `objectId` and responds to the
`#on` and `#off` methods. The reason that it does not descend from `Basis.Object` is because Basis
arrays are actually a copy of the native `Array` class with some added capabilities. A copy of
`Array` is created by grabbing a reference to the `Array` constructor function from an `iframe`.
This approach allows us to create a custom array class that behaves just like normal arrays without
manipulating the main native `Array`.

This approach does have some caveats however. As mentioned `Basis.Array` does not truly descend from
`Basis.Object`. Also, javascript provides no means to hook into use of the brackets operator (`[]`)
when setting array indexes. This means that observers will not be notified when an array is mutated
using the brackets operator. To set a value at a specific index in an observable manner, use the
`Basis.Array#at` method instead:

```javascript
var a = Basis.Array.of(1,2,3);

console.log(a.toString());
// [1, 2, 3]
a.on('@', function() { console.log('a was mutated:', a.toString()); });
a[3] = 4;
Basis.Object.flush();
a.at(4, 5);
Basis.Object.flush();
// a was mutated: [1, 2, 3, 4, 5]
```

Here you can see that by setting `a[3] = 4` our observer was never notified. But by using the `#at`
method, the observer was notified.

### Computed props on associations

Now that we know how associations work, its time to take another look at computed props and some
enhancements that are available on `Basis.Model`. With subclasses of `Basis.Object` we saw how you
can define computed props that depend on other props on the same object. But sometimes we have a
need to compute properties from properties on other objects. `Basis.Model` associations make this
possible in an observable way.

So how do we indicate that our computed prop depends on props on associated objects? We simply use
dots to create a property path. Lets take a look at an example:

```javascript
var Author = Basis.Model.extend('Author', function() {
  this.attr('name', 'string');
  this.hasMany('posts', 'Post');
});

var Post = Basis.Model.extend('Post', function() {
  this.hasOne('author', 'Author');

  this.prop('authorName', {
    on: ['author.name'],
    get: function(authorName) {
      return authorName;
    }
  });
});

var author = new Author({name: 'Joe Blow'});
var post = new Post({author: author});
console.log(post.authorName);
// Joe Blow
post.on('authorName', function() { console.log('post.authorName changed:', post.authorName); });
author.name = 'Jon Doe';
// post.authorName changed: Jon Doe
```

We've defined the `Post#authorName` prop that depends on the post's author's `name` prop. We
indicate this by passing the path `'author.name'` as the `on` option. This works because
`Basis.Model` instances propagate change notifications to their associated objects.

Its important to point out here that you are only allowed to have one dot in a dependent property
path - you can't depend on props that are not on immediate neighbors. This is by design as to make
it difficult to violate the [Law of Demeter][Law of Demeter]. It also makes for a much simpler
implementation. If you find yourself needing to declare a dependency on a prop that is not an
immediate neighbor, simply define a prop on that immediate neighbor that you can depend on instead.

But what about `hasMany` associations? How do we compute a prop over an array of objects? It works
the same as with `hasOne` associations in that you pass a property path using the `on` object, but
when the first segment in that path is an array, Basis will collect the next segment from each
individual element of the array and pass an array of those values to the getter function. Continuing
on with our previous example:

```javascript
Post.hasMany('tags', 'Tag');
Post.prop('tagNames', {
  on: ['tags.name'],
  get: function(tagNames) {
    return tagNames;
  }
});

var post = new Post({
  author: author,
  tags: [new Tag({name: 'a'}), new Tag({name: 'b'})]
});

console.log(post.tagNames);
// [ 'a', 'b' ]

post.on('tagNames', function() { console.log('post.tagNames changed:', post.tagNames); });

post.tags.push(new Tag({name: 'c'}));
Basis.Object.flush();
// post.tagNames changed: [ 'a', 'b', 'c' ]

post.tags.shift();
Basis.Object.flush();
// post.tagNames changed: [ 'b', 'c' ]

post.tags.first.name = 'x';
Basis.Object.flush();
// post.tagNames changed: [ 'x', 'c' ]
```

Our `Post#tagNames` prop depends on the `name` props of all of its associated `Tag`s. You can see
that when the `tags` array is maniptulated, observers of the `tagNames` prop are notified. Also,
when any currently associated `Tag` has its `name` prop changed the `tagNames` observers are still
notified.

This ability to define computed props over associated objects is very powerful. You can build out
computed props that are effectively monitoring a large number of objects for changes. This comes in
very handy when rendering views and keeping them in sync with model changes. We'll see more about
how to do that later.

### Persistence layer

So far we've seen how to instantiate new models but nothing regarding persisting them to permanent
storage. Basis is completely agnostic as to the persistence mechanism used in your application and
it uses the [data mapper][data mapper] pattern to communicate with it. Since Basis was designed to
be used as the model layer of a UI application, the most common persistence mechanism is an HTTP
API.

The data mapper pattern is very simple, each `Basis.Model` subclass that needs to be persisted must
have its `mapper` property assigned to an object that responds to one or more of the following
methods:

* query(params)
* get(id)
* create(model)
* update(model)
* delete(model)

These methods are responsible for doing the actual communication with the persistence layer and are
invoked by the `Basis.Model` class. You should rarely ever need to call these methods directly.
Since communicating with your persistence layer will likely involve an asynchronous operation, these
methods all must return an `Promise` or promise like object that gets resolved/rejected when the
asynchronous operation is complete. `Basis.Model` will throw an exception if a promise is not
returned by these methods.

Lets take a look at an example:

```javascript
var records = [
  {id: 0, firstName: 'Homer', lastName: 'Simpson'},
  {id: 1, firstName: 'Marge', lastName: 'Simpson'},
  {id: 2, firstName: 'Ned', lastName: 'Flanders'},
  {id: 3, firstName: 'Barney', lastName: 'Gumble'}
];

var PersonMapper = {
  query: function(params) {
    return new Promise(function(resolve, reject) {
      resolve(records);
    });
  },

  update: function(model) {
    return new Promise(function(resolve, reject) {
      records[model.id] = model.attrs();
      resolve(records[model.id]);
    });
  }
};

var Person = Basis.Model.extend('Person', function() {
  this.mapper = PersonMapper;

  this.attr('firstName', 'string');
  this.attr('lastName', 'string');
});

var people = Person.query();
console.log(people.toString());
// []
console.log(people.isBusy);
// true

people.then(function() {
  console.log(people.toString());
  // [
  //   #<Person (LOADED):3 {"firstName":"Homer","lastName":"Simpson","id":0}>,
  //   #<Person (LOADED):4 {"firstName":"Marge","lastName":"Simpson","id":1}>,
  //   #<Person (LOADED):5 {"firstName":"Ned","lastName":"Flanders","id":2}>,
  //   #<Person (LOADED):6 {"firstName":"Barney","lastName":"Gumble","id":3}>
  // ]
  console.log(people.isBusy);
  // false

  var person = people.first;

  person.firstName = 'Lisa';
  person.save();
  console.log(person.toString());
  // #<Person (LOADED-BUSY):3 {"firstName":"Lisa","lastName":"Simpson","id":0}>
  person.then(function() {
    console.log(person.toString());
    // #<Person (LOADED):3 {"firstName":"Lisa","lastName":"Simpson","id":0}>
  });
});

```

Here we can see that our mapper is just a simple javascript object. It can be as simple or complex
as you desire, it just needs to respond to the appropriate methods mentioned above.

The example has implemented two methods, `query` and `update`, which allows us to use the
`Basis.Model.query` and `Basis.Model#save` methods. Here we're just operating on an in memory array,
but in practice you'd likely talk to an API.

Calling `query` on a model class will immediately return an empty array that has been enhanced with
some new properties. One is the `isBusy` property which will be set to `true` until the mapper has
resolved its promise. The array also has a `then` method, meaning it can be treated as a promise
which we make use of to schedule some code to run after the query has completed.

From there we grab the first model in the resulting query then update and save it. Calling save on
a loaded model causes the model layer to invoke the mapper's `update` method (calling `save` on a
new model will invoke the mapper's `create` method). From the `toString` representations you can
see the model is in the busy state while the mapper is doing its work.

### Model state

Above we got a glimpse of how Basis tracks the state of a model when its interacting with the
mapper - the `Basis.Model#isBusy` prop is set to `true` while a mapper operation is pending and is
`false` otherwise. In addition to tracking the busy state of a model Basis also tracks the source
state. The source state is available as the `Basis.Model#sourceState` prop and will always be set to
one of the following states:

* `NEW`
* `EMPTY`
* `LOADED`
* `DELETED`

There are corresponding props to each of these states:

* `isNew`
* `isEmpty`
* `isLoaded`
* `isDeleted`

New models are those that have been instantiated but not yet persisted through the mapper:

```javascript
var TestModel = Basis.Model.extend('TestModel', function() {
  this.mapper = {
    get: function(id) {
      return Promise.resolve({id: id, foo: (new Date).toString()});
    }
  };

  this.attr('foo', 'string');
});

var newModel = new TestModel;
console.log(newModel.toString());
// #<TestModel (NEW):1 {}>
```

Empty models represent just an id and no other data. A model in the empty state is immediately
returned by the `Basis.Model.get` method:

```javascript
var emptyModel = TestModel.get(9);
console.log(emptyModel.toString());
// #<TestModel (EMPTY-BUSY):2 {"id":9}>
```

You can also create an empty model with the `Basis.Model.empty` method:

```javascript
var emptyModel2 = TestModel.empty(21);
console.log(emptyModel2.toString());
// #<TestModel (EMPTY):3 {"id":21}>
```

Loaded models are models that have passed through the mapper from the persistence layer:

```javascript
var loadedModel = TestModel.get(23);
loadedModel.then(function() {
  console.log(loadedModel.toString());
  // #<TestModel (LOADED):4 {"foo":"Wed Nov 04 2015 17:20:31 GMT-0600 (CST)","id":23}>
});
```

Finally, the deleted state is reached after a model has been successfully deleted by the mapper:

```javascript
loadedModel.delete().then(function() {
  console.log(loadedModel.toString());
});
// #<TestModel (DELETED):4 {"foo":"Wed Nov 04 2015 17:23:14 GMT-0600 (CST)","id":23}>
```

### Loading data

When data gets loaded through the mapper via `#query`, `#get`, or `.get` methods, Basis is actually
calling the `Basis.Model.load` method and passing it the object that the mapper resolves its promise
with. The `.load` method is very powerful in that it can do much more than just load the attributes
for a single model object - it can also automatically load nested associated models as long as the
object structure matches the defined associations:

```javascript
var Author = Basis.Model.extend('Author', function() {
  this.attr('first', 'string');
  this.attr('last', 'string');
  this.hasMany('posts', 'Post', {inverse: 'author'});
});

var Post = Basis.Model.extend('Post', function() {
  this.attr('title', 'string');
  this.attr('body', 'string');
  this.hasOne('author', 'Author', {inverse: 'posts'});
  this.hasMany('tags', 'Tag', {inverse: 'posts'});
});

var Tag = Basis.Model.extend('Tag', function() {
  this.attr('name', 'string');
  this.hasMany('posts', 'Post', {inverse: 'tags'});
});

var post = Post.load({
  id: 200, title: 'the title', body: 'the body',
  author: {id: 9, first: 'Homer', last: 'Simpson'},
  tags: [{id: 10, name: '#a'}, {id: 11, name: '#b'}]
});

console.log(post.toString());
// #<Post (LOADED):1 {"title":"the title","body":"the body","id":200,"author":9,"tags":[10,11]}>
console.log(post.author.toString());
// #<Author (LOADED):2 {"first":"Homer","last":"Simpson","id":9,"posts":[200]}>
console.log(post.author.posts.toString());
// [#<Post (LOADED):1 {"title":"the title","body":"the body","id":200,"author":9,"tags":[10,11]}>]
console.log(post.tags.first.posts.toString());
// [#<Post (LOADED):1 {"title":"the title","body":"the body","id":200,"author":9,"tags":[10,11]}>]
```

Here we call `.load` on the `Post` class and a loaded instance of `Post` is returned. But if we look
deeper we can see that the post's `author` and `tags` associations are also populated with loaded
instances of the `Author` and `Tag` classes. Further, since the associations all have their inverses
defined, the inverse associations are also properly established.

With the `.load` method, loading data from your backend is trival as long as you build your APIs to
match the structure of the Basis models. When you have differences, its the mapper's responsibilty
to munge the data received from the persistence layer to make it loadable by Basis.

### Change tracking

### Validations

### React integration

## Example Apps

A couple of simple example apps are available in the `examples` directory. To run them, simply serve
the `examples` directory using an HTTP server and load the `index.html` files.

Here is an easy way to serve the directory:

```
$ ruby -run -e httpd ./examples -p 9090
```

Then load http://localhost:9090/basic/index.html.


[es6-shim]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
[Object.defineProperty]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
[identity map]: http://martinfowler.com/eaaCatalog/identityMap.html
[ISO 8601]: https://en.wikipedia.org/wiki/ISO_8601
[Date]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
[data mapper]: http://martinfowler.com/eaaCatalog/dataMapper.html
[Law of Demeter]: https://en.wikipedia.org/wiki/Law_of_Demeter
