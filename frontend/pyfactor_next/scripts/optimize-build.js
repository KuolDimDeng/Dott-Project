#!/usr/bin/env node

/**
 * Build Optimization Script
 * Reduces Next.js build time by:
 * 1. Disabling unnecessary features
 * 2. Optimizing webpack configuration
 * 3. Using build cache effectively
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Optimizing build configuration...');

// Create optimized next.config for production builds
const optimizedConfig = `
const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
  
  // Disable source maps in production for faster builds
  productionBrowserSourceMaps: false,
  
  // Optimize images
  images: {
    domains: ['dottapps.com', 'api.dottapps.com'],
    minimumCacheTTL: 60,
  },
  
  // Disable build-time type checking (already done in CI)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Experimental optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@heroicons/react', '@headlessui/react'],
  },
  
  // Minimal webpack config
  webpack: (config, { isServer }) => {
    // Optimize for production builds
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        concatenateModules: true,
        minimize: true,
      };
    }
    
    // Disable source maps
    config.devtool = false;
    
    return config;
  },
  
  // Include all necessary env vars
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    NEXT_PUBLIC_AUTH0_AUDIENCE: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    NEXT_PUBLIC_CRISP_WEBSITE_ID: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    // Auth0 SDK variables
    APP_BASE_URL: process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL,
    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL,
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_SECRET: process.env.AUTH0_SECRET,
  },
};
`;

// Write optimized config
fs.writeFileSync(
  path.join(__dirname, '../next.config.build.js'),
  optimizedConfig
);

console.log('✅ Created optimized build configuration');

// Create build script
const buildScript = `
#!/bin/bash
set -e

echo "🏗️  Starting optimized production build..."

# Clean previous builds
rm -rf .next

# Set environment for optimized build
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=4096"

# Use optimized config
cp next.config.build.js next.config.js

# Run production build
echo "📦 Building application..."
pnpm run build

# Restore original config
git checkout next.config.js

echo "✅ Build completed successfully!"
`;

fs.writeFileSync(
  path.join(__dirname, '../build-optimized.sh'),
  buildScript,
  { mode: 0o755 }
);

console.log('✅ Created optimized build script');
console.log('\nTo use: ./build-optimized.sh');