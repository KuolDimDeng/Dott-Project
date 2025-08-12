/** @type {import('next').NextConfig} */
const path = require('path');

// Optimized configuration for Render's 2GB memory limit
const nextConfig = {
  // Basic settings
  reactStrictMode: false, // Save memory by disabling double renders
  
  // Disable standalone to reduce memory during build
  // output: 'standalone', // Commented out - uses default output
  
  // Experimental optimizations for low memory
  experimental: {
    // Single CPU to reduce memory overhead
    cpus: 1,
    workerThreads: false,
    webpackBuildWorker: false,
    
    // Reduce memory for large pages
    largePageDataBytes: 50 * 1024, // 50KB instead of 128KB
    
    // Disable parallel processing
    parallelism: 1,
  },
  
  // Environment variables (minimal set)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dottapps.com',
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  
  // Skip type checking and linting during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimized webpack config for low memory
  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      // Reduce memory usage during build
      config.optimization = {
        minimize: false, // Disable minification to save memory
        concatenateModules: false,
        splitChunks: {
          chunks: 'async',
          minSize: 100000, // 100KB minimum chunk size
          maxAsyncRequests: 3,
          maxInitialRequests: 3,
          cacheGroups: {
            default: false,
            vendors: false,
            // Only essential chunks
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
          },
        },
        runtimeChunk: false,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        sideEffects: false,
      };
      
      // No source maps in production
      config.devtool = false;
      
      // Limit parallelism
      config.parallelism = 1;
      
      // Reduce cache memory usage
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: path.resolve('.next/cache/webpack'),
      };
      
      // Memory limits
      config.performance = {
        hints: false,
        maxAssetSize: 5000000,
        maxEntrypointSize: 5000000,
      };
    }
    
    // Fix "self is not defined" error
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        self: path.resolve(__dirname, 'src/utils/webpack-self-polyfill.js'),
      };
    }
    
    // Minimal polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      net: false,
      tls: false,
    };
    
    // Exclude heavy dependencies
    config.externals = [
      ...(config.externals || []),
      'canvas',
      'jsdom',
    ];
    
    return config;
  },
  
  // Disable image optimization
  images: {
    unoptimized: true,
  },
  
  // Disable features that consume memory
  productionBrowserSourceMaps: false,
  compress: false, // Let Cloudflare handle compression
  poweredByHeader: false,
  
  // Reduce concurrent builds
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 1 minute
    pagesBufferLength: 2, // Build 2 pages at a time
  },
};

module.exports = nextConfig;