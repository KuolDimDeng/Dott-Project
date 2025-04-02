#!/bin/bash

# Stop any running Next.js processes
echo "Stopping any running Next.js processes..."
pkill -f "next dev" || true

# Create pnpm-lock.yaml if needed
echo "Setting up pnpm..."
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi

# Clean up node_modules and caches
echo "Cleaning project..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .pnpm-store

# Install dependencies with pnpm
echo "Installing dependencies with pnpm..."
pnpm install

# Install specific polyfills for module compatibility
echo "Installing module compatibility polyfills..."
pnpm add -D process buffer constants-browserify webpack

# Create a module fix script
cat > ./src/lib/modulePolyfill.js << 'EOF'
// This file provides global polyfills for module compatibility
if (typeof globalThis !== 'undefined') {
  // Fix for modules expecting CommonJS environment
  if (typeof globalThis.exports === 'undefined') {
    globalThis.exports = {};
  }
  
  if (typeof globalThis.module === 'undefined') {
    globalThis.module = { exports: globalThis.exports };
  } else if (typeof globalThis.module.exports === 'undefined') {
    globalThis.module.exports = globalThis.exports;
  }
  
  // Ensure process is available
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = { env: { NODE_ENV: 'production' } };
  }
  
  // Mock require for ESM
  if (typeof globalThis.require === 'undefined') {
    globalThis.require = function(module) {
      console.warn(`Module ${module} was required but require is not available`);
      return {};
    };
    globalThis.require.resolve = () => '';
  }
}

// Export a function that can be imported to trigger the polyfills
export function ensureModuleCompatibility() {}
export default ensureModuleCompatibility;
EOF

# Add it to _app.js
mkdir -p ./src/pages
cat > ./src/pages/_app.js << 'EOF'
import '../lib/modulePolyfill';
import { AppProps } from 'next/app';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
EOF

echo "Starting Next.js with pnpm..."
pnpm dev 