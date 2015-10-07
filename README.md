# Transis

Transis is a javascript data modeling library for use in single page web applications. It provides
the following features:

* two-way associations
* identity map
* separation of business logic from persistence logic via the data mapper pattern
* ability to easily load nested models from a complex JSON object (see `Transis.Model.load`)
* typed attributes with coercion
* model state management (empty, new, loaded, busy, etc.)
* attribute change tracking with undo functionality
* property observation of both simple and computed properties
* automatic computed property caching

Model classes can be created by extending the `Transis.Model` class:

```javascript
var Person = Transis.Model.extend('Person', function() {
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

Transis has no dependencies other than some ES6 features that are not yet available in all browsers.
Its advised to use [es6-shim](https://github.com/paulmillr/es6-shim/) until browser support
improves.

## Feature Breakdown

Below is a walkthrough of the main `Transis` features.

### Two-way associations

Associations between models can be defined using the `Transis.Model.hasOne` and
`Transis.Model.hasMany` methods:

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

