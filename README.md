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

### Two-way associations

Associations between models can be defined using the `Basis.Model.hasOne` and `Basis.Model.hasMany`
methods:

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

a.books;           //=> [#<Book (NEW):1 {"title":"A Game of Thrones"}>, #<Book (NEW):2 {"title":"A Storm of Swords"}>]
a.books[0].author; //=> #<Author (NEW):3 {"name":"George R. R. Martin"}>
a.books[1].author; //=> #<Author (NEW):3 {"name":"George R. R. Martin"}>

var book = a.books.pop();

a.books;     //=> [#<Book (NEW):1 {"title":"A Game of Thrones"}>]
book.author; //=> undefined
```

As you can see above, the associations are two-way, meaning that if you update one side of the
association, the other side will be automatically updated as well. This will be the case as long
as you specify the `inverse` option on both sides of the association.

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
