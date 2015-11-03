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

Model classes can be created by extending the `Basis.Model` class:

```javascript
var Person = Basis.Model.extend('Person', function() {
  this.attr('firstName', 'string');
  this.attr('lastName', 'string');
  this.attr('birthday', 'date');

  this.prop('fullName', {
    cache: true, on: ['firstName', 'lastName'],
    get: function(firstName, lastName) {
      return firstName + ' ' + lastName;
    }
  });
});

var mj = Person.load({
  id: 23, firstName: 'Michael', lastName: 'Jordan', birthday: '1963-02-17'
});
mj.firstName; //=> 'Michael'
mj.lastName;  //=> 'Jordan'
mj.birthday;  //=> Sun Feb 17 1963 00:00:00 GMT-0600 (CST)
mj.fullName;  //=> 'Michael Jordan'
```

## Dependencies

Basis has no dependencies other than some ES6 features that are not yet available in all browsers.
Its advised to use [es6-shim](https://github.com/paulmillr/es6-shim/) until browser support
improves.

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

