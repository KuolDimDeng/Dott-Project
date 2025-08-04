// Polyfill for Function.prototype.bind in case of compatibility issues
if (typeof window !== 'undefined' && !Function.prototype.bind) {
  Function.prototype.bind = function(oThis) {
    if (typeof this !== 'function') {
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function() {},
        fBound = function() {
          return fToBind.apply(this instanceof fNOP
                 ? this
                 : oThis,
                 aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    if (this.prototype) {
      fNOP.prototype = this.prototype; 
    }
    fBound.prototype = new fNOP();

    return fBound;
  };
}

// Also check for issues with undefined bindings
if (typeof window !== 'undefined') {
  const originalBind = Function.prototype.bind;
  Function.prototype.bind = function(...args) {
    if (typeof this !== 'function') {
      console.error('[Bind Error] Attempted to bind non-function:', this);
      console.trace();
      return function() {};
    }
    return originalBind.apply(this, args);
  };
}
