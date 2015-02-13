import "es6-shim";
import BasisObject from "../object";
import BasisArray from "../array";
import ProxyArray from "../proxy_array";

describe('ProxyArray', function() {
  var ProxyArrayModel = BasisObject.extend('ProxyArrayModel', function() {
    this.prop('x');
  });

  beforeEach(function() {
    this.owner = new BasisObject;
    this.a = new ProxyArray(this.owner, 'things');
    this.a.push(new ProxyArrayModel({x: 1}));
    this.a.push(new ProxyArrayModel({x: 2}));
    this.a.push(new ProxyArrayModel({x: 3}));

    this.owner.on('*', this.spy = jasmine.createSpy());
  });

  it('proxies change events to the owner', function() {
    this.a.at(0).x = 10;
    expect(this.spy).toHaveBeenCalledWith('change:things.x', {
      array: this.a, object: this.a.at(0), old: 1
    });
  });

  it('proxies splice events to the owner', function() {
    var x = this.a.pop();
    expect(this.spy).toHaveBeenCalledWith('splice:things', {
      array: this.a, i: 2, n: 1, added: [], removed: [x]
    });
  });

  it('does not proxy other event types to the owner', function() {
    this.a.emit('foobar');
    this.a.emit('x:y');
    expect(this.spy).not.toHaveBeenCalled();
  });

  describe('#proxy', function() {
    it('returns a new ProxyArray instance with the contents of the receiver', function() {
      var owner = new BasisObject;
      var a = BasisArray.A(1,2,3);
      var p = a.proxy(owner, 'foos');

      expect(p instanceof ProxyArray).toBe(true);
      expect(p.__owner__).toBe(owner);
      expect(p.__name__).toBe('foos');
      expect(p).toEqual(a);
    });
  });
});
