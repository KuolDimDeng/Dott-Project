/** @type {import('next').NextConfig} */

// ULTRA-MINIMAL CONFIG FOR MEMORY-CONSTRAINED BUILDS
// This config removes most features while keeping build working
const nextConfig = {
  // Disable React strict mode to save memory
  reactStrictMode: false,
  
  // Minimal experimental features
  experimental: {
    // Process with single CPU to reduce memory
    workerThreads: false,
    cpus: 1,
    
    // Disable parallel processing
    webpackBuildWorker: false,
  },
  
  // Minimal environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dottapps.com',
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
  },
  
  // Skip build-time checks
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Simplified webpack config
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      // Reduce optimization levels to save memory
      config.optimization = {
        ...config.optimization,
        minimize: false, // Disable minification to save memory
        concatenateModules: false,
        splitChunks: {
          chunks: 'async',
          minSize: 50000, // Increase chunk size to reduce number of chunks
          maxAsyncRequests: 5,
          maxInitialRequests: 3,
          cacheGroups: {
            default: false,
            vendors: false,
            // Only keep framework chunk
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
        innerGraph: false,
      };
      
      // Disable source maps
      config.devtool = false;
      
      // Reduce module parsing to save memory
      config.module.parser = {
        javascript: {
          exprContextCritical: false,
        },
      };
      
      // Simple caching
      config.cache = {
        type: 'memory',
        maxGenerations: 1,
      };
    }
    
    // Fix for "self is not defined" error
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        self: require('path').resolve(__dirname, 'src/utils/webpack-self-polyfill.js'),
      };
    }
    
    // Node polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
  
  // Disable image optimization
  images: {
    unoptimized: true,
  },
  
  // Disable build features
  productionBrowserSourceMaps: false,
  compress: false,
  poweredByHeader: false,
  
  // Page extensions
  pageExtensions: ['js', 'jsx'],
  
  // Process files with limited parallelism
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 5, // 5 minutes
    pagesBufferLength: 2, // Process 2 pages at a time
  },
};

module.exports = nextConfig;