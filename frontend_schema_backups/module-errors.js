// This is a script to troubleshoot module loading errors

// CommonJS compatibility layer
// This helps in situations where some modules expect CommonJS and others expect ESM
if (typeof exports === 'undefined') {
  globalThis.exports = {};
}

if (typeof module === 'undefined') {
  globalThis.module = { exports: {} };
}

// Browser compatibility for node modules
if (typeof process === 'undefined') {
  globalThis.process = { 
    env: { NODE_ENV: 'production' },
    browser: true
  };
}

// Create fake require function if needed
if (typeof require === 'undefined') {
  globalThis.require = function(moduleName) {
    console.warn(`Attempted to require "${moduleName}" but require is not available`);
    return {};
  };
  globalThis.require.resolve = () => '';
} 