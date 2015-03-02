function formatCost(n) { return typeof n === 'number' ? n.toFixed(2) : ''; }

var Invoice = Basis.Model.extend('Invoice', function() {
  this.attr('name', 'string');

  this.hasMany('lineItems', 'LineItem', {owner: true, inverse: 'invoice'});

  this.prop('quantity', {
    cache: true, on: ['lineItems', 'lineItems.quantity'],
    get: function() {
      return this.lineItems.map(function(li) { return li.quantity; })
        .compact()
        .reduce(function(sum, q) { return sum + q; }, null);
    }
  });

  this.prop('cost', {
    cache: true, on: ['lineItems', 'lineItems.cost'],
    get: function() {
      return this.lineItems.map(function(li) { return li.cost; })
        .compact()
        .reduce(function(sum, q) { return sum + q; }, null);
    }
  });

  this.prop('avgRate', {
    on: ['quantity', 'cost'],
    get: function() {
      if (typeof this.quantity !== 'number' || typeof this.cost !== 'number') {
        return null;
      }

      return this.cost / this.quantity;
    }
  });
});

var LineItem = Basis.Model.extend('LineItem', function() {
  this.attr('name', 'string');
  this.attr('quantity', 'number');
  this.attr('rate', 'number');

  this.hasOne('invoice', 'Invoice', {inverse: 'lineItems'});

  this.prop('cost', {
    on: ['quantity', 'rate'],
    get: function() {
      if (typeof this.quantity !== 'number' || typeof this.rate !== 'number') { return null; }
      return this.quantity * this.rate;
    }
  });
});

var LineItemView = React.createClass({
  mixins: [Basis.ReactMixin],

  displayProps: {
    lineItem: ['*']
  },

  propTypes: {
    lineItem: React.PropTypes.instanceOf(LineItem)
  },

  getInitialState: function() {
    return {};
  },

  render: function() {
    return (
      <tr className="form-inline">
        <td style={{textAlign: 'center'}}>
          <button className="btn btn-danger btn-sm" onClick={this.onDelete}>
            <span className="glyphicon glyphicon-remove" aria-hidden="true">
            </span>
          </button>
        </td>
        <td>
          <input
            className="form-control"
            type="text"
            value={this.state.name || this.props.lineItem.name}
            onFocus={this.onFocus.bind(this, 'name')}
            onChange={this.onChange.bind(this, 'name')}
            onBlur={this.onBlur.bind(this, 'name')} />
        </td>
        <td style={{textAlign: 'right'}}>
          <input
            className="form-control"
            type="text"
            value={this.state.quantity || this.props.lineItem.quantity}
            onFocus={this.onFocus.bind(this, 'quantity')}
            onChange={this.onChange.bind(this, 'quantity')}
            onBlur={this.onBlur.bind(this, 'quantity')} />
        </td>
        <td style={{textAlign: 'right'}}>
          <input
            className="form-control"
            type="text"
            value={this.state.rate || this.props.lineItem.rate}
            onFocus={this.onFocus.bind(this, 'rate')}
            onChange={this.onChange.bind(this, 'rate')}
            onBlur={this.onBlur.bind(this, 'rate')} />
        </td>
        <td style={{textAlign: 'right'}}>
          {formatCost(this.props.lineItem.cost)}
        </td>
      </tr>
    );
  },

  onChange: function(prop, event) {
    var state = {};
    state[prop] = event.target.value;
    this.setState(state);
  },

  onFocus: function(prop) {
    var state = {};
    state[prop] = this.props.lineItem[prop];
    this.setState(state);
  },

  onBlur: function(prop) {
    var state = {};
    state[prop] = undefined;
    this.setState(state);
    this.props.lineItem[prop] = this.state[prop];
  },

  onDelete: function() {
    this.props.onDelete(this.props.lineItem);
  }
});

var InvoiceTotalsView = React.createClass({
  mixins: [Basis.ReactMixin],

  displayProps: {
    invoice: ['quantity', 'avgRate', 'cost']
  },

  propTypes: {
    invoice: React.PropTypes.instanceOf(Invoice)
  },

  render: function() {
    return (
      <tr style={{fontWeight: 600}}>
        <td></td>
        <td>Totals:</td>
        <td style={{textAlign: 'right'}}>{this.props.invoice.quantity}</td>
        <td style={{textAlign: 'right'}}>{formatCost(this.props.invoice.avgRate)}</td>
        <td style={{textAlign: 'right'}}>{formatCost(this.props.invoice.cost)}</td>
      </tr>
    );
  }
});

var InvoiceView = React.createClass({
  mixins: [Basis.ReactMixin],

  displayProps: {
    invoice: ['name', 'lineItems', 'hasChanges']
  },

  propTypes: {
    invoice: React.PropTypes.instanceOf(Invoice)
  },

  renderLineItems: function() {
    return this.props.invoice.lineItems.map(function(li) {
      return <LineItemView key={li.objectId} lineItem={li} onDelete={this.deleteLineItem} />;
    }, this);
  },

  renderUndoButton: function() {
    return (
      <button
        className="btn btn-primary btn-sm pull-right"
        disabled={!this.props.invoice.hasChanges}
        onClick={this.undoChanges}>
        <span className="glyphicon glyphicon-repeat" aria-hidden="true"></span> Undo
      </button>
    );
  },

  render: function() {
    return (
      <table className="table table-bordered table-striped">
        <caption>
          {this.props.invoice.name}
          {this.renderUndoButton()}
        </caption>
        <thead>
          <tr>
            <td style={{textAlign: 'center'}}>
              <button className="btn btn-primary btn-sm" onClick={this.addLineItem}>
                <span className="glyphicon glyphicon-plus" aria-hidden="true"></span>
              </button>
            </td>
            <td>Name</td>
            <td style={{textAlign: 'right'}}>Quantity</td>
            <td style={{textAlign: 'right'}}>Rate</td>
            <td style={{textAlign: 'right'}}>Cost</td>
          </tr>
        </thead>
        <tbody>
          {this.renderLineItems()}
        </tbody>
        <tfoot>
          <InvoiceTotalsView invoice={invoice} onAddLineItem={this.addLineItem} />
        </tfoot>
      </table>
    );
  },

  addLineItem: function() {
    this.props.invoice.lineItems.push(new LineItem);
  },

  deleteLineItem: function(lineItem) {
    var i = this.props.invoice.lineItems.indexOf(lineItem);
    this.props.invoice.lineItems.splice(i, 1);
  },

  undoChanges: function() {
    this.props.invoice.undoChanges();
  }
});

var App = React.createClass({
  propTypes: {
    invoice: React.PropTypes.instanceOf(Invoice)
  },

  render: function() {
    return <InvoiceView invoice={this.props.invoice} />;
  }
});

var invoice = Invoice.load({
  id: 1,
  name: 'My Invoice',
  lineItems: [
    {id: 1, name: 'aaa', rate: 3.2,  quantity: 12},
    {id: 2, name: 'bbb', rate: 0.25, quantity: 21},
    {id: 3, name: 'ccc', rate: 7.5,  quantity: 3},
    {id: 4, name: 'ddd', rate: 5,    quantity: 8}
  ]
});

React.render(<App invoice={invoice} />, document.querySelector('#app'));
