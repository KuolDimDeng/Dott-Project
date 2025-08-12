/** @type {import('next').NextConfig} */
const path = require('path');

// Optimized configuration for FAST production builds
const nextConfig = {
  // Basic settings
  reactStrictMode: true,
  trailingSlash: false,
  output: 'standalone',
  
  // ⚡ SPEED OPTIMIZATION 1: SWC Compiler
  swcMinify: true, // Faster than Terser
  
  // ⚡ SPEED OPTIMIZATION 2: Parallel Processing
  experimental: {
    // Enable parallel routes compilation
    cpus: 4, // Use 4 CPU cores for builds
    
    // Optimize package imports
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      'lodash',
      'date-fns',
      '@phosphor-icons/react',
      'react-hook-form',
      'axios'
    ],
    
    // Turbopack for development (experimental but FAST)
    // turbo: process.env.NODE_ENV === 'development',
  },
  
  // ⚡ SPEED OPTIMIZATION 3: Modular Imports
  modularizeImports: {
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
    'lodash': {
      transform: 'lodash/{{member}}',
    },
    '@phosphor-icons/react': {
      transform: '@phosphor-icons/react/dist/icons/{{member}}',
    },
  },
  
  // ⚡ SPEED OPTIMIZATION 4: Webpack Configuration
  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      // Production optimizations
      config.optimization = {
        ...config.optimization,
        
        // Enable module concatenation (scope hoisting)
        concatenateModules: true,
        
        // Use deterministic IDs for better caching
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        
        // Single runtime chunk for better caching
        runtimeChunk: 'single',
        
        // Aggressive code splitting
        splitChunks: {
          chunks: 'all',
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          minSize: 20000,
          
          cacheGroups: {
            default: false,
            vendors: false,
            
            // Framework chunk (React, Next.js)
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next|scheduler)[\\/]/,
              priority: 50,
              chunks: 'all',
              enforce: true,
            },
            
            // Vendor libraries
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 40,
              chunks: 'all',
              reuseExistingChunk: true,
            },
            
            // Domain-specific chunks
            domains: {
              name(module) {
                const match = module.resource?.match(/domains[\\/](\\w+)/);
                return match ? `domain-${match[1]}` : 'domain-shared';
              },
              test: /[\\/]domains[\\/]/,
              priority: 35,
              chunks: 'all',
              reuseExistingChunk: true,
            },
            
            // Shared components
            shared: {
              name: 'shared',
              test: /[\\/]shared[\\/]/,
              priority: 30,
              chunks: 'all',
              reuseExistingChunk: true,
            },
            
            // Common chunks
            common: {
              name: 'common',
              minChunks: 2,
              priority: 20,
              chunks: 'all',
              reuseExistingChunk: true,
            },
          },
        },
        
        // Minimize with SWC (faster than Terser)
        minimize: true,
        
        // Remove dead code
        usedExports: true,
        sideEffects: false,
      };
      
      // ⚡ SPEED OPTIMIZATION 5: Parallel builds
      config.parallelism = 4;
      
      // ⚡ SPEED OPTIMIZATION 6: Cache configuration
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: path.resolve('.next/cache/webpack'),
      };
      
      // ⚡ SPEED OPTIMIZATION 7: Ignore watch for faster builds
      config.watchOptions = {
        ignored: ['**/node_modules', '**/.git', '**/.next', '**/dist', '**/build'],
      };
    }
    
    // Mark architecture improvements
    config.plugins.push(
      new (require('webpack')).DefinePlugin({
        '__DOMAIN_ARCHITECTURE__': JSON.stringify(true),
        '__ROUTER_SYSTEM__': JSON.stringify(true),
        '__SERVICE_LAYER__': JSON.stringify(true),
        '__ERROR_BOUNDARIES__': JSON.stringify(true),
        '__PERFORMANCE_OPTS__': JSON.stringify(true),
      })
    );
    
    return config;
  },
  
  // ⚡ SPEED OPTIMIZATION 8: Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // ⚡ SPEED OPTIMIZATION 9: Minimal transpilation
  transpilePackages: [], // Don't transpile node_modules
  
  // ⚡ SPEED OPTIMIZATION 10: Skip validation
  eslint: {
    ignoreDuringBuilds: true, // Skip ESLint
  },
  typescript: {
    ignoreBuildErrors: true, // Skip TypeScript checks
  },
  
  // Image optimization
  images: {
    unoptimized: true, // Faster builds
    domains: ['api.dottapps.com', 'dottapps.com'],
  },
  
  // Compression
  compress: true,
  
  // Environment variables (minimal)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    // Add only essential env vars
  },
  
  // Headers for caching
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// ⚡ SPEED OPTIMIZATION 11: Remove Sentry during build
const enableSentry = false; // Disable for faster builds

if (enableSentry && process.env.NODE_ENV === 'production') {
  const { withSentryConfig } = require('@sentry/nextjs');
  module.exports = withSentryConfig(nextConfig, {
    silent: true,
    disableLogger: true,
  });
} else {
  module.exports = nextConfig;
}