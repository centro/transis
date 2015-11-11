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
    return (
      <div className="well">
        {this.props.person.fullName.length ?
          <span>Hello, {this.props.person.fullName}</span> : <span>No name</span>
        }
      </div>
    );
  }
});

var PersonEditView = React.createClass({
  mixins: [Transis.ReactPropsMixin({person: ['firstName', 'lastName']})],

  propTypes: {
    person: React.PropTypes.instanceOf(Person)
  },

  render: function() {
    return (
      <div className="form-group">
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          className="form-control"
          autoComplete="off"
          type="text"
          placeholder="First name"
          value={this.props.person.firstName}
          onChange={this.onChange.bind(this, 'firstName')} />

        <label htmlFor="lastName">Last name</label>
        <input
          id="lastName"
          className="form-control"
          autoComplete="off"
          type="text"
          placeholder="Last name"
          value={this.props.person.lastName}
          onChange={this.onChange.bind(this, 'lastName')} />
      </div>
    );
  },

  onChange: function(prop, event) {
    this.props.person[prop] = event.target.value;
  }
});

var App = React.createClass({
  propTypes: {
    person: React.PropTypes.instanceOf(Person)
  },

  render: function() {
    return (
      <div className="row">
        <div className="col-md-4 col-md-offset-4">
          <PersonView person={this.props.person} />
          <PersonEditView person={this.props.person} />
        </div>
      </div>
    );
  }
});

var person = new Person();
React.render(<App person={person} />, document.querySelector('#app'));
