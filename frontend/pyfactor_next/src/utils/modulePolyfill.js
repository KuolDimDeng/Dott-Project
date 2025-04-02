// This file provides compatibility for mixed ESM/CommonJS modules

// Add module compatibility globals
if (typeof globalThis !== 'undefined') {
  // Ensure exports is defined
  if (typeof globalThis.exports === 'undefined') {
    globalThis.exports = {};
  }
  
  // Ensure module.exports is defined
  if (typeof globalThis.module === 'undefined') {
    globalThis.module = { exports: {} };
  } else if (typeof globalThis.module.exports === 'undefined') {
    globalThis.module.exports = {};
  }
}

export default function ensureModuleCompatibility() {
  // This function can be imported at the top of problematic files
  // The import itself will trigger the polyfill code above
} 