#!/bin/bash

echo "Stopping any running Next.js processes..."
pkill -f "next dev" || true

echo "Ensuring utility directories exist..."
mkdir -p src/utils

echo "Creating process-browser.js polyfill..."
cat << 'EOF' > src/utils/process-browser.js
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
EOF

echo "Creating debug module stub..."
cat << 'EOF' > src/utils/debug-stub.js
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
EOF

echo "Creating logger stub..."
cat << 'EOF' > src/utils/logger-stub.js
// This is a simplified version of logger.js that doesn't depend on the debug module
// It will replace the original logger.js temporarily

// Simple logger implementation that doesn't rely on debug
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

// Create a simple logger function
function createLogger(namespace) {
  const logger = {};
  
  // Create methods for each log level
  Object.values(LOG_LEVELS).forEach(level => {
    logger[level] = function(...args) {
      // Only log in development or if specifically enabled
      if (typeof window !== 'undefined' && 
          (process.env.NODE_ENV === 'development' || window.__DEBUG_ENABLED__)) {
        console[level](`[${namespace}] [${level.toUpperCase()}]:`, ...args);
      }
    };
  });
  
  return logger;
}

// Create a default logger instance
const logger = createLogger('pyfactor');

// Export the logger and utilities
module.exports = {
  logger,
  createLogger,
  LOG_LEVELS,
};

// For ESM imports
module.exports.default = module.exports;
EOF

echo "Creating .env.local to configure DEBUG..."
cat << 'EOF' > .env.local
# Set DEBUG variable for dev tools
DEBUG=*,-babel:*,-express:*,-socket.io:*,-engine:*,-morgan*
EOF

echo "Clearing Next.js cache..."
rm -rf .next

# Backup original files if they exist
if [ -f next.config.js ]; then
  echo "Backing up original next.config.js..."
  cp next.config.js next.config.js.bak
fi

if [ -f src/utils/logger.js ]; then
  echo "Backing up original logger.js..."
  cp src/utils/logger.js src/utils/logger.js.bak
  
  echo "Using logger stub..."
  cp src/utils/logger-stub.js src/utils/logger.js
fi

# Copy our config to next.config.js temporarily
echo "Using simplified config..."
cp next.config.simple.js next.config.js

echo "Starting Next.js..."
NODE_OPTIONS="--max-old-space-size=4096" pnpm dev 