import "es6-shim";
import BasisObject from "../object";
import BasisArray from "../array";
import ProxyArray from "../proxy_array";

describe('ProxyArray', function() {
  var ProxyArrayModel = BasisObject.extend(function() {
    this.prop('x');
  });

  beforeEach(function() {
    this.owner = new BasisObject;
    this.a = new ProxyArray(this.owner, 'things');
    this.a.push(new ProxyArrayModel({x: 1}));
    this.a.push(new ProxyArrayModel({x: 2}));
    this.a.push(new ProxyArrayModel({x: 3}));
  });

  it('proxies prop changes to the owner', function() {
    var spy = jasmine.createSpy();
    this.owner.on('things.x', spy);
    this.a.at(0).x = 10;
    BasisObject.flush();
    expect(spy).toHaveBeenCalledWith('things.x');
  });

  it('proxies splice events to the owner', function() {
    var spy = jasmine.createSpy();
    this.owner.on('things', spy);
    this.a.pop();
    BasisObject.flush();
    expect(spy).toHaveBeenCalledWith('things');
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

    it('does not immediately trigger a change on the owner', function() {
      var owner = new BasisObject;
      var a = BasisArray.A(1,2,3);
      var spy = jasmine.createSpy();

      owner.on('foos', spy);
      a.proxy(owner, 'foos');
      BasisObject.flush();

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
