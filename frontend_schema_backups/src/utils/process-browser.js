/**
 * This is a replacement for process/browser that avoids the
 * "exports is not defined" error in Next.js App Router
 */

// Simple CommonJS-only process polyfill
// Using a pure CommonJS approach to avoid exports/module conflicts

const processPolyfill = {
  env: typeof process !== 'undefined' && process.env ? process.env : {},
  browser: true,
  version: '',
  platform: '',
  nextTick: function(fn) {
    setTimeout(fn, 0);
  }
};

// Export as CommonJS only - using ESM syntax causes issues in Next.js
module.exports = processPolyfill;
