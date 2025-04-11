// This is a simplified stub for the debug module
// It avoids the process/browser dependency issue entirely

function createDebug(namespace) {
  // Create a simple debug function that wraps console.log
  const debugFn = function(...args) {
    if (typeof window !== 'undefined' && window.__DEBUG_ENABLED__) {
      console.log(`[${namespace}]`, ...args);
    }
  };
  
  // Add the same API as the real debug module
  debugFn.enabled = false;
  debugFn.color = '';
  debugFn.destroy = () => {};
  debugFn.extend = (name) => createDebug(`${namespace}:${name}`);
  
  return debugFn;
}

// Set up the module-level properties so it mimics the real debug module
createDebug.coerce = (val) => val;
createDebug.disable = () => '';
createDebug.enable = (namespaces) => {
  if (typeof window !== 'undefined') {
    window.__DEBUG_ENABLED__ = namespaces && namespaces.length > 0;
  }
};
createDebug.enabled = () => false;
createDebug.formatArgs = () => {};
createDebug.humanize = () => '';
createDebug.names = [];
createDebug.skips = [];
createDebug.formatters = {};
createDebug.selectColor = () => 0;
createDebug.instances = [];

// Export a function that looks like the debug module
module.exports = createDebug;
module.exports.default = createDebug;
module.exports.__esModule = true;
