#!/bin/bash
set -e

# Script to fix browserslist issues in Next.js

echo "Fixing browserslist configuration..."

# Find and check browserslist files
echo "Removing any .browserslistrc files in the project..."
find /Users/kuoldeng/projectx/frontend/pyfactor_next -name ".browserslistrc" -delete

# Clear caches
echo "Cleaning Next.js cache..."
rm -rf /Users/kuoldeng/projectx/frontend/pyfactor_next/.next
rm -rf /Users/kuoldeng/projectx/frontend/pyfactor_next/node_modules/.cache

# Create new config file
echo "Creating fresh .browserslistrc file..."
cat > /Users/kuoldeng/projectx/frontend/pyfactor_next/.browserslistrc << EOL
defaults
not ie 11
not op_mini all
not dead
opera >= 50
chrome >= 60
firefox >= 60
safari >= 12
edge >= 18
ios >= 12
EOL

# Fix Babel config to remove explicit browser targets
echo "Updating Babel configuration..."
cp /Users/kuoldeng/projectx/frontend/pyfactor_next/babel.config.js /Users/kuoldeng/projectx/frontend/pyfactor_next/babel.config.js.bak

cat > /Users/kuoldeng/projectx/frontend/pyfactor_next/babel.config.js << EOL
module.exports = {
  presets: [
    [
      'next/babel',
      {
        'preset-env': {
          useBuiltIns: 'usage',
          corejs: 3,
          modules: false
        }
      }
    ]
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-runtime', { regenerator: true }],
    '@babel/plugin-syntax-dynamic-import'
  ],
  env: {
    development: {
      compact: false
    }
  }
};
EOL

echo "Fix complete! Now try running the optimized script: 'pnpm run dev:pnpm'"