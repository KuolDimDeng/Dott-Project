/**
 * Webpack polyfill for 'self' global
 * This file provides a polyfill for the 'self' global variable which is not available in Node.js
 * but is expected by some browser-oriented libraries during SSR builds.
 */

// In Node.js environment, make self point to global
if (typeof self === 'undefined') {
  if (typeof global !== 'undefined') {
    global.self = global;
  }
}

// Export the appropriate global object
module.exports = typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : {});