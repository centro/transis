# Basis

Basis is a javascript data modeling library for use in single page web applications. It provides
the following features:

* two way associations
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
    get: function() {
      return this.firstName + ' ' + this.lastName;
    }
  });
});

var mj = Person.load({id: 23, firstName: 'Michael', lastName: 'Jordan', birthday: '1963-02-17'})
mj.firstName; //=> 'Michael'
mj.lastName;  //=> 'Jordan'
mj.birthday;  //=> Sun Feb 17 1963 00:00:00 GMT-0600 (CST)
mj.fullName;  //=> 'Michael Jordan'
```

## Dependencies

Basis has no dependencies other than some ES6 features that are not yet available in all browsers.
Its advised to use [es6-shim](https://github.com/paulmillr/es6-shim/) until browser support
improves.

