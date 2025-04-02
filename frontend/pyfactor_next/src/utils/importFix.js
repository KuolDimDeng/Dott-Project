// Import this at the top of any component experiencing "exports is not defined" errors
export function fixModuleCompat() {
  if (typeof window !== 'undefined') {
    if (typeof window.exports === 'undefined') {
      window.exports = {};
    }
    if (typeof window.module === 'undefined') {
      window.module = { exports: {} };
    }
    if (typeof window.process === 'undefined') {
      window.process = { env: {} };
    }
    if (typeof window.require === 'undefined') {
      window.require = function(mod) {
        console.warn('require() polyfill called for:', mod);
        return {};
      };
    }
  }
}

// This ensures the fix runs on import
fixModuleCompat();

// Default export for simpler imports
export default fixModuleCompat; 