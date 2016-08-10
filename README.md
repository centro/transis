![Transis](https://cdn.rawgit.com/centro/transis/master/logo.svg)

---

Transis is a JavaScript data modeling library useful for creating rich client-side experiences. It
provides the following features:

* two-way associations
* identity map
* separation of business logic from persistence logic via the data mapper pattern
* ability to easily load nested models from a complex JSON object (see `Transis.Model.load`)
* typed attributes with coercion
* model state management (empty, new, loaded, busy, etc.)
* attribute change tracking with undo functionality
* property observation of both simple and computed properties
* automatic computed property caching
* React integration

## Dependencies

Transis has no dependencies other than some ES6 features that are not yet available in all browsers.
It's advised to use [es6-shim][es6-shim] until browser support improves.

## Installation

```
npm install --save transis
```

## Usage

```javascript
var Transis = require('transis');

var Person = Transis.Model.extend('Person', function() {
  this.attr('firstName', 'string');
  this.attr('lastName', 'string');
  this.prop('fullName', {
    on: ['firstName', 'lastName'],
    get: function(firstName, lastName) {
      return Transis.A(firstName, lastName).compact().join(' ');
    }
  });
});
```

## Feature Breakdown

Below is a walk-through of the main `Transis` features.

### Object system

`Transis` provides a basic object system that works on top of constructor functions and the `new`
operator. New classes are created by calling the `extend` method on `Transis.Object` and passing it
a function that represents the "class body". The `extend` method returns a regular constructor
function that can be instantiated with the `new` operator. Inside the class body function you can
define both static and instance properties and methods. To add an initializer, simply define the
`init` method, any arguments passed to the constructor function will be forwarded on to it.

The `extend` method sets up the prototype chain so that instance level inheritance works as
expected. It also copies static properties from the superclass to the subclass.

```javascript
var Shape = Transis.Object.extend(function() {
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
console.log('r area:', r.area());
// r area: 12
console.log('r perimeter:', r.perimeter());
// r perimeter: 14
console.log('s area:', s.area());
// s area: 25
console.log('s perimeter:', s.perimeter());
// s perimeter: 20
console.log('c area:', c.area());
// c area: 254.46900494077323
console.log('c perimeter:', c.perimeter());
// c perimeter: 56.548667764616276
```

### Props

The other main feature of `Transis.Object` is observable properties. Properties, or "props" to
distinguish them from normal JavaScript object properties, are defined with the
`Transis.Object.prop` method. The simplest prop is just defined with a name and can be get and set
just like any other JavaScript property:

```javascript
var Person = Transis.Object.extend(function() {
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

As you can see above, the default `Transis.Object` constructor takes an object mapping prop keys to
values. Any key in the given object that matches a defined prop will be set by the constructor.

What sets props apart from normal JavaScript properties is their ability to be observed. Observers
can be attached using the `Transis.Object#on` method:

```javascript
console.log(p.firstName);
// Jane

p.on('firstName', function() {
  console.log('firstName changed');
});

p.firstName = 'Bob';
// firstName changed
```

The `#on` method is very simple, it just takes a prop name and a callback function. To remove an
observer, use the `Transis.Object#off` method and pass it the same arguments passed to `#on`.

Transis props can be much more sophisticated than the example above - you can specify custom getter
and setter functions to be invoked whenever the prop is read or written. Under the hood the `prop`
method is using [`Object.defineProperty`][Object.defineProperty].

```javascript
var Doubler = Transis.Object.extend(function() {
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
doubler.on('doubledValue', function() {
  console.log('doubledValue changed:', doubler.doubledValue);
});
doubler.doubledValue = 22;
// doubledValue changed: 22
```

There is a problem with the above `Doubler` example however. If we set the `value` prop, that
effectively updates the `doubledValue` prop, but any observers on `doubledValue` won't get notified.
This is because we haven't informed Transis that the `doubledValue` prop actually depends on the
`value` prop. We can do that by using the `on` option to the `prop` method. Simply pass it a list of
prop names that the prop you are defining depends on:

```javascript
var Doubler2 = Transis.Object.extend(function() {
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
doubler2.on('doubledValue', function() {
  console.log('doubledValue changed:', doubler2.doubledValue);
});
doubler2.value = 5;
// doubledValue changed: 10
```

Now, our observer on the `doubledValue` prop gets notified when we change the `value` prop. This is
how you define observable computed properties in Transis.

One thing you may have noticed in the `Doubler2` example is that the `doubledValue` getter function
takes an argument and does not access `this`. This is what is known as a "pure" prop and is the
default when you define a custom getter function on your prop without also defining a custom setter.
A pure prop is called as such because its getter function must be a pure function, meaning it has no
side effects. This is enforced by Transis by invoking the getter function in the `null` context,
meaning `this` will be `null` inside the body of the function. So if you can't access `this`, how do
you access the dependent props? This is where the `on` option comes in. You must declare all
dependencies using the `on` option and Transis will take care of accessing them and passing them to
your getter function in the same order they are named in the `on` option.

If you must access `this` inside your getter, you can make your prop "impure" by setting the `pure`
option to false. In this case, no arguments will be passed to your getter function, even if you have
declared dependencies with the `on` option.

_A note about observers_: Transis prop observers do not fire immediately when a prop is changed,
they instead are fired asynchronously. This is important for performance reasons. Firing observers
immediately is simpler and more straightforward, but it can potentially lead to your app doing a lot
more work than necessary. This is especially true when leveraging observers to keep your views in
sync with your models - we don't want to trigger renders for every single prop change that happens
when loading in a bunch of data from our backend. By notifying observers asynchronously, we allow
things to settle before responding to any change. This means that if a prop is changed multiple
times in a single JavaScript execution context, observers will only be notified once. The
`Transis.Object.flush` method can be used to force observers to fire immediately. This method should
never be used in production code, it's only for making specs easier to write. An example should make
this clear:

```javascript
var Thing = Transis.Object.extend(function() {
  this.prop('name');
});

var thing = new Thing;

thing.on('name', function() {
  console.log('name changed:', thing.name);
});

thing.name = 'a';
thing.name = 'b';
thing.name = 'c';

Transis.Object.flush();
// name changed: c

thing.name = 'd';

Transis.Object.flush();
// name changed: d

thing.name = 'e';
thing.name = 'f';

Transis.Object.flush();
// name changed: f
```

### Cached props

Sometimes props are very expensive to compute and doing so over and over would have a significant
performance impact on your application. Since Transis knows about your computed prop dependencies,
it can easily cache prop values and invalidate that cache whenever a dependency changes. Simply add
the `cache` option to your prop definition:

```javascript
var Person = Transis.Object.extend(function() {
  this.prop('firstName');
  this.prop('lastName');
  this.prop('fullName', {
    cache: true,
    on: ['firstName', 'lastName'],
    get: function(firstName, lastName) {
      console.log('computing Person#firstName');
      return firstName + ' ' + lastName;
    }
  });
});

var p = new Person({firstName: 'Homer', lastName: 'Simpson'});
console.log(p.fullName);
// computing Person#firstName
// Homer Simpson
console.log(p.fullName);
// Homer Simpson
p.firstName = 'Marge';
Transis.Object.flush();
console.log(p.fullName);
// computing Person#firstName
// Marge Simpson
console.log(p.fullName);
// Marge Simpson
```

### Model layer

The `Transis.Object` class is the foundation of Transis, but you will likely rarely use it directly
in a user interface application to define your model objects. Instead you will use `Transis.Model`
which is a subclass of `Transis.Object` and therefore inherits its ability to define observable
props.

`Transis.Model` builds on `Transis.Object` by adding an identity map, typed attributes, two-way
associations, a thin persistence layer, state management, change tracking, and validations. Each of
these features will be explored next.

### Identity map

`Transis.Model` makes use of an [identity map][identity map] to ensure that each model instance gets
loaded only once into memory. A model instance is uniquely identified by its class and `id` prop.

This is important for user interface applications because things can quickly get out of hand if we
allow for having multiple objects that all represent the same thing. If you update one object but
have another object that represents the same thing bound to a view, the view won't update because
its version of the object wasn't actually changed.

### Typed attributes

`Transis.Model` introduces a new way to define typed props, otherwise known as attributes with the
`Transis.Model.attr` method. Attributes are special Transis props that ensure their value is of a
particular type. This is really helpful when dealing with JSON APIs where the amount of data types
is fairly limited. For example, JSON doesn't support a Date data type, but Transis provides a date
attribute type that will automatically parse [ISO 8601][ISO 8601] formatted date strings and turn
them into JavaScript [`Date`][Date] objects.

Transis supports the following attribute types:

* identity (no coercion is performed)
* string
* integer
* number
* boolean
* date
* datetime

Additionally, you can register your own custom attribute types using the
`Transis.Model.registerAttr` method.

Here is an example of attributes in action:

```javascript
var Person = Transis.Model.extend('Person', function() {
  this.attr('firstName', 'string');
  this.attr('lastName', 'string');
  this.attr('birthday', 'date');
  this.attr('numberOfPets', 'integer');
});

var p = new Person({
  firstName: 'Joe', lastName: 'Blow', birthday: '1970-01-01', numberOfPets: '3'
});
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

Also take note of the way we're calling `extend` here as it's slightly different than calling
`extend` directly on `Transis.Object`. When extending `Transis.Model` you must pass a string
representing the class name as the first argument. This class name is used when defining
associations, which we'll take a look at next.

### Two-way associations

All but the most trivial data models have relationships among models. Transis helps model these
relationships with associations. Associations come in two flavors: a to-one relation or to-many
relationship. When the association is defined on both sides of the relationship, the association is
said to be two-way, meaning that manipulating one side of the association also manipulates the other
side. For example, if an `Author` model has many `Book`s, and we add a book to an author's `books`
association, that book will automatically have its `author` prop set. The reverse is true as well,
if a book's `author` property is set, then that book instance gets added to the author's `books`
association.

Associations between models are defined using the `Transis.Model.hasOne` and `Transis.Model.hasMany`
methods. These generate special props, which of course are observable.

```javascript
var Author = Transis.Model.extend('Author', function() {
  this.attr('name', 'string');
  this.hasMany('books', 'Book', {inverse: 'author'});
});

var Book = Transis.Model.extend('Book', function() {
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
// [
//   #<Book (NEW):1 {"title":"A Game of Thrones"}>,
//   #<Book (NEW):2 {"title":"A Storm of Swords"}>
// ]
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
passed to  `Transis.Model.extend`), and an options hash. This will add a new prop to the class. For
`hasOne` associations the value of that prop is either `undefined` or an instance of the associated
model class. For `hasMany` associations, the value is always an array containing zero or more
instances of the associated model class.

Next you can see the two-way associations in action. The `inverse` option on both sides must be set
in order for the association to be two-way. This is how Transis figures out the prop to update on
the other side when an association is changed.

At this point you may be wondering how popping an item from the `Author#books` array causes the
book's `author` prop to be updated. It works because Transis `hasMany` associations don't use
regular native array objects, they instead use `Transis.Array` objects. Lets take a brief interlude
from discussing `Transis.Model` to take a look at `Transis.Array`.

### `Transis.Array`

The `Transis.Array` class implements an observable native-like array. It behaves just like a native
array except that it has some enhanced capabilities. An example best illustrates this:

```javascript
var a1 = Transis.Array.of(1,2,3);
var a2 = Transis.Array.from([4,5,6]);

console.log(a1.toString());
// [1, 2, 3]
console.log(a2.toString());
// [4, 5, 6]

console.log(a1.size);
// 3
a1.on('size', function() { console.log('a1 size changed:', a1.size); });
a1.push(10);
Transis.Object.flush();
// a1 size changed: 4
a1.shift();
Transis.Object.flush();
// a1 size changed: 3

a2.on('@', function() { console.log('a2 was mutated:', a2.toString()); });
a2.pop();
Transis.Object.flush();
// a2 was mutated: [4, 5]
a2.at(0, 10);
Transis.Object.flush();
// a2 was mutated: [10, 5]
```

First we see two ways to instantiate a new `Transis.Array`. The first, using the `.of` method,
returns a new `Transis.Array` containing each argument. This is analogous to using the brackets
operator (`[]`) to create a native array. The second, using the `.from` method, converts a native
array or array-like object to a `Transis.Array`.

From there we can see that `Transis.Array` objects have a `size` prop that is observable. When a new
item is pushed on to the array or shifted off, observers of the `size` prop are notified.

Lastly we can see that `Transis.Array` objects have another observable prop named `@`. This is a
special prop used to observe mutations made to the array. Any operation that changes the contents of
the array in any way will notify observers of the `@` prop.

The `Transis.Array` class has an interesting implementation. It does not truly subclass
`Transis.Object`. You can see this by using the `instanceof` operator:

```javascript
var a = Transis.Array.of();
console.log(a instanceof Transis.Array);
// true
console.log(a instanceof Transis.Object);
// false
```

However, it behaves just like a `Transis.Object`. It is assigned an `objectId` and responds to the
`#on` and `#off` methods. The reason that it does not inherit from `Transis.Object` is because
Transis arrays are actually a copy of the native `Array` class with some added capabilities. A copy
of `Array` is created by grabbing a reference to the `Array` constructor function from an `iframe`.
This approach allows us to create a custom array class that behaves just like normal arrays without
manipulating the main native `Array`.

This approach does have some caveats however. As mentioned `Transis.Array` does not truly inherit
from `Transis.Object`. Also, JavaScript provides no means to hook into use of the brackets operator
(`[]`) when setting array indexes. This means that observers will not be notified when an array is
mutated using the brackets operator. To set a value at a specific index in an observable manner, use
the `Transis.Array#at` method instead:

```javascript
var a = Transis.Array.of(1,2,3);

console.log(a.toString());
// [1, 2, 3]
a.on('@', function() { console.log('a was mutated:', a.toString()); });
a[3] = 4;
Transis.Object.flush();
a.at(4, 5);
Transis.Object.flush();
// a was mutated: [1, 2, 3, 4, 5]
```

Here you can see that by setting `a[3] = 4` our observer was never notified. But by using the `#at`
method, the observer was notified.

### Computed props on associations

Now that we know how associations work, it's time to take another look at computed props and some
enhancements that are available on `Transis.Model`. With subclasses of `Transis.Object` we saw how
you can define computed props that depend on other props on the same object. But sometimes we have a
need to compute properties from properties on other objects. `Transis.Model` associations make this
possible in an observable way.

So how do we indicate that our computed prop depends on props on associated objects? We simply use
dots to create a property path. Lets take a look at an example:

```javascript
var Author = Transis.Model.extend('Author', function() {
  this.attr('name', 'string');
  this.hasMany('posts', 'Post');
});

var Post = Transis.Model.extend('Post', function() {
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
post.on('authorName', function() {
  console.log('post.authorName changed:', post.authorName);
});
author.name = 'Jon Doe';
// post.authorName changed: Jon Doe
```

We've defined the `Post#authorName` prop that depends on the post's author's `name` prop. We
indicate this by passing the path `'author.name'` as the `on` option. This works because
`Transis.Model` instances propagate change notifications to their associated objects.

It's important to point out here that you are only allowed to have one dot in a dependent property
path - you can't depend on props that are not on immediate neighbors. This is by design as to make
it difficult to violate the [Law of Demeter][Law of Demeter]. It also makes for a much simpler
implementation. If you find yourself needing to declare a dependency on a prop that is not an
immediate neighbor, simply define a prop on that immediate neighbor that you can depend on instead.

But what about `hasMany` associations? How do we compute a prop over an array of objects? It works
the same as with `hasOne` associations in that you pass a property path using the `on` object, but
when the first segment in that path is an array, Transis will collect the next segment from each
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

post.on('tagNames', function() {
  console.log('post.tagNames changed:', post.tagNames);
});

post.tags.push(new Tag({name: 'c'}));
Transis.Object.flush();
// post.tagNames changed: [ 'a', 'b', 'c' ]

post.tags.shift();
Transis.Object.flush();
// post.tagNames changed: [ 'b', 'c' ]

post.tags.first.name = 'x';
Transis.Object.flush();
// post.tagNames changed: [ 'x', 'c' ]
```

Our `Post#tagNames` prop depends on the `name` props of all of its associated `Tag`s. You can see
that when the `tags` array is manipulated, observers of the `tagNames` prop are notified. Also,
when any currently associated `Tag` has its `name` prop changed the `tagNames` observers are still
notified.

This ability to define computed props over associated objects is very powerful. You can build out
computed props that are effectively monitoring a large number of objects for changes. This comes in
very handy when rendering views and keeping them in sync with model changes. We'll see more about
how to do that later.

### Persistence layer

So far we've seen how to instantiate new models but nothing regarding persisting them to permanent
storage. Transis is completely agnostic as to the persistence mechanism used in your application and
it uses the [data mapper][data mapper] pattern to communicate with it. Since Transis was designed to
be used as the model layer of a UI application, the most common persistence mechanism is an HTTP
API.

The data mapper pattern is very simple, each `Transis.Model` subclass that needs to be persisted
must have its `mapper` property assigned to an object that responds to one or more of the following
methods:

* query(params)
* get(id)
* create(model)
* update(model)
* delete(model)

These methods are responsible for doing the actual communication with the persistence layer and are
invoked by the `Transis.Model` class. You should rarely ever need to call these methods directly.
Since communicating with your persistence layer will likely involve an asynchronous operation, these
methods all must return a `Promise` or promise like object that gets resolved/rejected when the
asynchronous operation is complete. `Transis.Model` will throw an exception if a promise is not
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

var Person = Transis.Model.extend('Person', function() {
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

Here we can see that our mapper is just a simple JavaScript object. It can be as simple or complex
as you desire, it just needs to respond to the appropriate methods mentioned above.

The example has implemented two methods, `query` and `update`, which allows us to use the
`Transis.Model.query` and `Transis.Model#save` methods. Here we're just operating on an in memory
array, but in practice you'd likely talk to an API.

Calling `query` on a model class will immediately return an empty array that has been enhanced with
some new properties. One is the `isBusy` property which will be set to `true` until the mapper has
resolved its promise. The array also has a `then` method, meaning it can be treated as a promise
which we make use of to schedule some code to run after the query has completed.

From there we grab the first model in the resulting query then update and save it. Calling save on
a loaded model causes the model layer to invoke the mapper's `update` method (calling `save` on a
new model will invoke the mapper's `create` method). From the `toString` representations you can
see the model is in the busy state while the mapper is doing its work.

### Model state

Above we got a glimpse of how Transis tracks the state of a model when it's interacting with the
mapper - the `Transis.Model#isBusy` prop is set to `true` while a mapper operation is pending and is
`false` otherwise. In addition to tracking the busy state of a model Transis also tracks the source
state. The source state is available as the `Transis.Model#sourceState` prop and will always be set
to one of the following states:

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
var TestModel = Transis.Model.extend('TestModel', function() {
  this.mapper = {
    get: function(id) {
      return Promise.resolve({id: id, foo: (new Date).toString()});
    },

    delete: function(model) {
      return Promise.resolve();
    }
  };

  this.attr('foo', 'string');
});

var newModel = new TestModel;
console.log(newModel.toString());
// #<TestModel (NEW):1 {}>
```

Empty models represent just an id and no other data. A model in the empty state is immediately
returned by the `Transis.Model.get` method:

```javascript
var emptyModel = TestModel.get(9);
console.log(emptyModel.toString());
// #<TestModel (EMPTY-BUSY):2 {"id":9}>
```

You can also create an empty model with the `Transis.Model.empty` method:

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

When data gets loaded through the mapper via `#query`, `#get`, or `.get` methods, Transis is
actually calling the `Transis.Model.load` method and passing it the object that the mapper resolves
its promise with. The `.load` method is very powerful in that it can do much more than just load the
attributes for a single model object - it can also automatically load nested associated models as
long as the object structure matches the defined associations:

```javascript
var Author = Transis.Model.extend('Author', function() {
  this.attr('first', 'string');
  this.attr('last', 'string');
  this.hasMany('posts', 'Post', {inverse: 'author'});
});

var Post = Transis.Model.extend('Post', function() {
  this.attr('title', 'string');
  this.attr('body', 'string');
  this.hasOne('author', 'Author', {inverse: 'posts'});
  this.hasMany('tags', 'Tag', {inverse: 'posts'});
});

var Tag = Transis.Model.extend('Tag', function() {
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

With the `.load` method, loading data from your backend is trivial as long as you build your APIs to
match the structure of the Transis models. When you have differences, it's the mapper's responsibility
to munge the data received from the persistence layer to make it loadable by Transis.

### Change tracking

Transis has automatic attribute change tracking built in. If you change an attribute from what was
loaded, Transis will keep track of the previous value. This makes undoing changes trivial:

```javascript
var Person = Transis.Model.extend('Person', function() {
  this.attr('firstName', 'string');
  this.attr('lastName', 'string');
});

var p = Person.load({id: 1, firstName: 'Homer', lastName: 'Simpson'});
console.log(p.hasChanges);
// false
console.log(p.changes);
// {}
p.firstName = 'Bart';
console.log(p.hasChanges);
// true
console.log(p.changes);
// { firstName: 'Homer' }

console.log(p.toString());
// #<Person (LOADED):1 {"firstName":"Bart","lastName":"Simpson","id":1}>
s.undoChanges();
console.log(p.toString());
// #<Person (LOADED):1 {"firstName":"Homer","lastName":"Simpson","id":1}>
```

This example introduces the `Transis.Model#hasChanges` and `#changes` props. The `hasChanges` prop
returns a boolean indicating whether or not the model has any attribute changes. The `changes` prop
returns an object mapping the attribute that has changed to its previous value. We can also see that
changes can be reverted by simply calling the `#undoChanges` method.

This is useful, but there are times when we have UIs that allow for editing a hierarchy of data and
we want to track changes throughout the whole hierarchy. We can do this by using the `owner` option
on association definitions. When you set the `owner` option on the association, you are telling
Transis to treat any changes made to the associated objects as changes on the owner object. So
`#hasChanges` will return `true` on the owner if any of its owned objects have changes.

```javascript
var Invoice = Transis.Model.extend('Invoice', function() {
  this.attr('name', 'string');

  this.hasMany('lineItems', 'LineItem', {owner: true, inverse: 'invoice'});
});

var LineItem = Transis.Model.extend('LineItem', function() {
  this.attr('name', 'string');
  this.attr('quantity', 'number');
  this.attr('rate', 'number');

  this.hasOne('invoice', 'Invoice', {inverse: 'lineItems'});
});

var invoice = Invoice.load({
  id: 9,
  name: 'my invoice',
  lineItems: [
    {id: 100, name: 'a', quantity: 100, rate: 2.5},
    {id: 101, name: 'b', quantity:  50, rate: 3},
    {id: 102, name: 'c', quantity: 250, rate: 0.8},
  ]
});

console.log(invoice.hasChanges);
// false

invoice.lineItems[0].quantity++;

console.log(invoice.lineItems[0].quantity);
// 101
console.log(invoice.hasChanges);
// true
console.log(invoice.changes);
// { 'lineItems.0.quantity': 100 }

invoice.name = 'my awesome invoice';
console.log(invoice.hasChanges);
// true
console.log(invoice.changes);
// { name: 'my invoice', 'lineItems.0.quantity': 100 }

invoice.undoChanges();
console.log(invoice.hasChanges);
// false
console.log(invoice.name);
// my invoice
console.log(invoice.lineItems[0].quantity);
// 100
```

Here we can see that by changing the `quantity` prop of one of the invoice's line items, that the
line item is now reporting changes. For owned `hasMany` associations the key used in the `changes`
object is the name of the association followed by the index of the object that changed followed by
the attribute that changed.

If we also make changes directly to the owner object, those changes are also listed in the `changes`
object.

Finally we can see that by calling `undoChanges` on the invoice, we also undo any changes on its
owned line items.

Note: `undoChanges` can be scoped using the options `only` and `except` by providing a string or array of names.
* `invoice.undoChanges({only: 'lineItems'}));` Only undoes changes for lineItems and ignores the `name` attribute.
* `invoice.undoChanges({except: 'lineItems'}));` Undoes all changes except for the `lineItems` assocation.

In addition to tracking attribute changes, Transis will also track changes made to `hasMany`
associations. So adding or removing an object from a `hasMany` array can also be undone:

```javascript
console.log(invoice.lineItems.toString());
// [
//   #<LineItem (LOADED):3 {"name":"a","quantity":100,"rate":2.5,"id":100,"invoice":9}>,
//   #<LineItem (LOADED):4 {"name":"b","quantity":50,"rate":3,"id":101,"invoice":9}>,
//   #<LineItem (LOADED):5 {"name":"c","quantity":250,"rate":0.8,"id":102,"invoice":9}>
// ]
invoice.lineItems.pop();
console.log(invoice.changes);
// { lineItems: { added: [], removed: [ [Object] ] } }
console.log(invoice.lineItems.toString());
// [
//   #<LineItem (LOADED):3 {"name":"a","quantity":100,"rate":2.5,"id":100,"invoice":9}>,
//   #<LineItem (LOADED):4 {"name":"b","quantity":50,"rate":3,"id":101,"invoice":9}>
// ]
invoice.undoChanges();
console.log(invoice.lineItems.toString());
// [
//   #<LineItem (LOADED):3 {"name":"a","quantity":100,"rate":2.5,"id":100,"invoice":9}>,
//   #<LineItem (LOADED):4 {"name":"b","quantity":50,"rate":3,"id":101,"invoice":9}>,
//   #<LineItem (LOADED):5 {"name":"c","quantity":250,"rate":0.8,"id":102,"invoice":9}>
// ]
```

### Validations

Transis provides a simple validation framework for your models. At the class level you can register
validator functions for individual attributes with the `Transis.Model.validate` class method.
Calling the `Transis.Model#validate` instance method will run all registered validator functions.
The validator functions should call the `#addError` method when it detects a validation error.

```javascript
var Invoice = Transis.Model.extend('Invoice', function() {
  this.attr('name', 'string');
  this.hasMany('lineItems', 'LineItem', {owner: true});

  this.validate('name', function() {
    if (!this.name || this.name.length < 6) {
      this.addError('name', 'must be at least 6 characters');
    }
  });
});

var LineItem = Transis.Model.extend('LineItem', function() {
  this.attr('quantity', 'number');
  this.attr('rate', 'number');

  this.validate('quantity', function() {
    if (this.quantity < 0) {
      this.addError('quantity', 'must be positive');
    }
  });
});

var invoice = new Invoice({name: 'foo'});
console.log(invoice.validate());
// false
console.log(invoice.errors);
// { name: [ 'must be at least 6 characters' ] }
invoice.name = 'foobar';
console.log(invoice.validate());
// true
console.log(invoice.errors);
// {}
```

We can see here that the `#validate` method returns a boolean indicating whether or not the model
is valid. If there are validation errors, they are available on the object returned by the `#errors`
prop. The attribute that failed validation is the key and the value is an array of messages added
by the `#addError` method.

The `owner` option on associations used for change tracking also affects validations. The
`#validate` method will recursively validate each owned associated model and make their errors
available on the owner's `errors` prop:

```javascript
var invoice = new Invoice({
  name: 'my invoice',
  lineItems: [
    new LineItem({quantity: 4, rate: 2.5}),
    new LineItem({quantity: -2, rate: 6}),
  ]
});

console.log(invoice.validate());
// false
console.log(invoice.errors);
// { 'lineItems.1.quantity': [ 'must be positive' ] }
```

So even though the invoice object didn't have any validation errors, the `#validate` method returned
`false` because one of its owned line item object did have an error.

Transis also supports validation contexts. Multiple contextual validations can be registered for the same attribute.
Each contextual validation may be executed depending on the context provided. Contextual validations will only be applied
when a matching context value is provided to the `Transis.Model.validate` method.

All validations with no context defined will run no matter the context. Validations with a context defined will only run in the specified context.

```javascript
var Invoice = Transis.Model.extend('Invoice', function() {
  this.attr('name', 'string');
  this.hasMany('lineItems', 'LineItem');

  this.validate('name', function() {
    if (!this.name || this.name.length < 6) {
      this.addError('name', 'must be at least 6 characters');
    }
  }, {on: 'nameContext'});
});

var invoice = new Invoice({name: 'foo'});
console.log(invoice.validate());
// true
console.log(invoice.validate('nameContext'));
// false
console.log(invoice.errors);
// { name: [ 'must be at least 6 characters' ] }
```

### React integration

At Centro we use [React][React] to implement our views so we've created a small React mixin to make
it easy to glue your React components to Transis models. Other than this mixin, Transis has no
knowledge or dependency on React. It can be used with any view framework.

React does a great job of re-rendering when props or state changes are made, however often times
you pass a model instance to a React component and that model will undergo changes that need to
be re-rendered. Since the actual prop value isn't changing, just its internal state, React won't
know to trigger a re-render. Since our Transis model props are easily observable, it would be nice
if we could just inform the component what props to observe on the model so that it can
automatically update when any change. That's precisely what the `Transis.ReactPropsMixin` does:

```jsx
var Person = Transis.Model.extend('Person', function() {
  this.attr('firstName', 'string');
  this.attr('lastName', 'string');

  this.prop('fullName', {
    on: ['firstName', 'lastName'],
    get: function(firstName, lastName) {
      return Transis.A(firstName, lastName).compact().join(' ').trim();
    }
  });
});

var PersonView = React.createClass({
  mixins: [Transis.ReactPropsMixin({person: ['fullName']})],

  propTypes: {
    person: React.PropTypes.instanceOf(Person)
  },

  render: function() {
    var person = this.props.person;

    return (
      <div>Hello, {person.fullName}</div>;
    );
  }
});
```

Our `PersonView` component accepts a `person` prop that must be an instance of our `Person` model.
We create our glue mixin by calling the `Transis.ReactPropsMixin` function and passing it an object
that specifies the Transis props to observe on each React component prop. When any of these Transis
props change, the mixin will call `forceUpdate` on the component to trigger a re-render.

## Example Apps

A couple of simple example apps are available in the `examples` directory. Run them as follows:

```
$ npm install
$ make examples
```

This will launch a web server running on port `8080`. An index listing of the example apps can be
seen at http://localhost:8080/.

[es6-shim]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
[Object.defineProperty]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
[identity map]: http://martinfowler.com/eaaCatalog/identityMap.html
[ISO 8601]: https://en.wikipedia.org/wiki/ISO_8601
[Date]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
[data mapper]: http://martinfowler.com/eaaCatalog/dataMapper.html
[Law of Demeter]: https://en.wikipedia.org/wiki/Law_of_Demeter
[React]: https://facebook.github.io/react
