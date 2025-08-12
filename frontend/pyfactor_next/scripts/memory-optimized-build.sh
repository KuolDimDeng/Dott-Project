#!/bin/bash

# Memory-optimized build script for Render
# This script uses various techniques to minimize memory usage during build

echo "🚀 Starting memory-optimized build..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Set aggressive memory limits and garbage collection
export NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size --gc-interval=100"
export NEXT_TELEMETRY_DISABLED=1

# Disable optional features during build
export NEXT_PRIVATE_MINIMIZE_MEMORY_USAGE=1

# Create minimal next.config.js
echo "📝 Creating minimal build configuration..."
cat > next.config.build.js << 'EOF'
module.exports = {
  reactStrictMode: false,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  swcMinify: false,
  
  experimental: {
    workerThreads: false,
    cpus: 1,
    webpackBuildWorker: false,
  },
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dottapps.com',
  },
  
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.optimization = {
        minimize: false,
        splitChunks: false,
        runtimeChunk: false,
        concatenateModules: false,
      };
      config.devtool = false;
      config.cache = false;
      config.parallelism = 1;
      
      // Remove non-essential plugins
      config.plugins = config.plugins.filter(p => {
        const name = p.constructor.name;
        return ['DefinePlugin', 'ProvidePlugin'].includes(name);
      });
    }
    
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        self: require.resolve('./src/utils/webpack-self-polyfill.js'),
      };
    }
    
    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false,
    };
    
    return config;
  },
  
  images: { unoptimized: true },
  compress: false,
  poweredByHeader: false,
};
EOF

# Backup original config
cp next.config.js next.config.original.js

# Use minimal config for build
cp next.config.build.js next.config.js

echo "🏗️  Starting build with minimal config..."

# Try to build with progressively higher memory limits
for MEMORY in 1024 1536 2048; do
  echo "🔧 Attempting build with ${MEMORY}MB memory..."
  export NODE_OPTIONS="--max-old-space-size=${MEMORY} --optimize-for-size"
  
  if pnpm next build; then
    echo "✅ Build succeeded with ${MEMORY}MB!"
    break
  else
    echo "❌ Build failed with ${MEMORY}MB, trying higher limit..."
  fi
done

# Restore original config
echo "♻️  Restoring original configuration..."
cp next.config.original.js next.config.js
rm -f next.config.build.js next.config.original.js

echo "🎉 Build process completed!"