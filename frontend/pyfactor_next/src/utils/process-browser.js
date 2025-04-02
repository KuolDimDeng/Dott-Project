// This is a simple polyfill for 'process/browser'
// It's used to fix the "Module not found: Can't resolve 'process/browser'" error
// in the debug module

const process = {
  env: {
    NODE_ENV: typeof window !== 'undefined' ? (window.process?.env?.NODE_ENV || 'production') : 'production',
    DEBUG: typeof window !== 'undefined' ? (window.process?.env?.DEBUG || '') : '',
  },
  browser: true,
  version: '1.0.0',
  nextTick: typeof queueMicrotask !== 'undefined' ? queueMicrotask : callback => setTimeout(callback, 0)
};

if (typeof window !== 'undefined' && !window.process) {
  window.process = process;
}

module.exports = process;
