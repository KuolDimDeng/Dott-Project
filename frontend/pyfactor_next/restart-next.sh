#!/bin/bash

echo "Stopping any running Next.js processes..."
pkill -f "next dev" || true
pkill -f "node" || true

echo "Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "Creating module compatibility layer..."
cat > ./.next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  ...require('./next.config.js'),
  
  // Add vendor prefixes to fix module issues
  webpack: (config, options) => {
    const { isServer } = options;
    // Make a proper clone of the webpack config
    const nextConfig = require('./next.config.js');
    let newConfig = config;
    
    // Apply any existing webpack customizations
    if (typeof nextConfig.webpack === 'function') {
      newConfig = nextConfig.webpack(newConfig, options);
    }

    // Fix the "exports is not defined" error
    if (!isServer) {
      newConfig.resolve.fallback = {
        ...newConfig.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
      };
      
      // Ensure we don't have incompatible requires
      newConfig.module.rules.push({
        test: /\.m?js$/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        },
      });
    }
    
    return newConfig;
  }
};

module.exports = nextConfig;
EOF

echo "Restarting Next.js in development mode..."
NODE_OPTIONS="--enable-source-maps --max-old-space-size=8192" npm run dev 