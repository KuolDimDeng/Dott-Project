#!/bin/bash

# Script to install frontend dependencies using pnpm
# This will optimize memory usage during installation and development

echo "Installing frontend dependencies using pnpm..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

# Set pnpm to use less memory during installation
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean any existing node_modules to prevent conflicts
if [ -d "node_modules" ]; then
    echo "Removing existing node_modules..."
    rm -rf node_modules
fi

# Clean pnpm cache to ensure fresh installation
echo "Cleaning pnpm cache..."
pnpm store prune

# Install dependencies with pnpm
echo "Installing dependencies with pnpm..."
pnpm install --shamefully-hoist

# Install memory optimization packages
echo "Installing memory optimization packages..."
pnpm add -D @next/bundle-analyzer cross-env

# Update package.json to add memory-optimized scripts
echo "Updating package.json with memory-optimized scripts..."
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Add memory optimization scripts
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts['dev:optimized'] = 'cross-env NODE_OPTIONS=\"--max-old-space-size=4096\" next dev';
packageJson.scripts['build:optimized'] = 'cross-env NODE_OPTIONS=\"--max-old-space-size=4096\" next build';
packageJson.scripts['analyze'] = 'cross-env ANALYZE=true next build';
packageJson.scripts['start:optimized'] = 'cross-env NODE_OPTIONS=\"--max-old-space-size=4096\" next start';

// Write updated package.json
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
"

# Create next.config.js with memory optimizations if it doesn't exist
if [ ! -f "next.config.memory.js" ]; then
    echo "Creating memory-optimized Next.js config..."
    cat > next.config.memory.js << 'EOL'
/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = process.env.ANALYZE === 'true' 
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

const nextConfig = {
  // Reduce memory usage during builds
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', '@mui/icons-material', 'lodash', 'date-fns'],
    memoryBasedWorkersCount: true,
    serverMinification: true,
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
  },
  
  // Optimize webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Add memory optimizations
    config.optimization = {
      ...config.optimization,
      // Minimize all files in production
      minimize: !dev,
      // Split chunks to reduce main bundle size
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
      },
    };

    // Reduce bundle size by excluding moment.js locales
    config.plugins.push(
      new config.webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );

    // Optimize for server
    if (isServer) {
      // Externalize dependencies that don't need to be bundled
      config.externals = [...(config.externals || []), 
        { canvas: 'commonjs canvas' }
      ];
    }

    return config;
  },
  
  // Optimize server memory usage
  onDemandEntries: {
    // Keep pages in memory for 30 seconds
    maxInactiveAge: 30 * 1000,
    // Only keep 3 pages in memory
    pagesBufferLength: 3,
  },
  
  // Reduce memory usage by disabling source maps in production
  productionBrowserSourceMaps: false,
  
  // Reduce memory usage by compressing assets
  compress: true,
  
  // Reduce memory usage by setting a lower memory limit for the server
  env: {
    NODE_OPTIONS: '--max-old-space-size=4096',
  },
  
  // Reduce memory usage by setting a lower memory limit for the build
  poweredByHeader: false,
};

// Apply bundle analyzer if enabled
const configWithBundleAnalyzer = withBundleAnalyzer(nextConfig);

// Apply Sentry if available
try {
  const { withSentryConfig } = require('@sentry/nextjs');
  module.exports = withSentryConfig(configWithBundleAnalyzer);
} catch (e) {
  module.exports = configWithBundleAnalyzer;
}
EOL
fi

echo "Frontend dependencies installed successfully!"
echo "You can now run the optimized frontend with: pnpm run dev:optimized"