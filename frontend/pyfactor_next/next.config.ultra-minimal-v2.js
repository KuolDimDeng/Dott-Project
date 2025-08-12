/** @type {import('next').NextConfig} */

// ULTRA-MINIMAL V2 CONFIG - MAXIMUM MEMORY SAVING
const nextConfig = {
  reactStrictMode: false,
  
  // Experimental features for memory optimization
  experimental: {
    workerThreads: false,
    cpus: 1,
    webpackBuildWorker: false,
    // Use incremental compilation
    incrementalCacheHandlerPath: false,
    // Reduce memory for large pages
    largePageDataBytes: 50 * 1024, // 50KB instead of default 128KB
  },
  
  // Minimal env vars
  env: {
    NEXT_PUBLIC_API_URL: 'https://api.dottapps.com',
    NEXT_PUBLIC_BASE_URL: 'https://www.dottapps.com',
  },
  
  // Skip all checks
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      // AGGRESSIVE memory optimization
      config.optimization = {
        minimize: false,
        concatenateModules: false,
        splitChunks: false, // Disable chunk splitting entirely
        runtimeChunk: false,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        sideEffects: false,
        providedExports: false,
        usedExports: false,
        innerGraph: false,
        mangleExports: false,
      };
      
      // No source maps
      config.devtool = false;
      
      // Disable ALL caching
      config.cache = false;
      
      // Reduce parallelism
      config.parallelism = 1;
      
      // Limit memory usage for webpack
      config.performance = {
        maxAssetSize: 5000000, // 5MB
        maxEntrypointSize: 5000000,
      };
      
      // Reduce module processing
      config.module = {
        ...config.module,
        unsafeCache: false,
      };
      
      // Keep only essential webpack plugins
      const essentialPlugins = ['DefinePlugin', 'ProvidePlugin'];
      config.plugins = config.plugins.filter(plugin => {
        const name = plugin.constructor.name;
        return essentialPlugins.some(p => name.includes(p));
      });
    }
    
    // Self polyfill for server
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        self: require.resolve('./src/utils/webpack-self-polyfill.js'),
      };
    }
    
    // Minimal fallbacks
    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };
    
    // Exclude large modules
    config.externals = [
      ...(config.externals || []),
      'canvas',
      'jsdom',
      '@sentry/nextjs',
      'next-pwa',
    ];
    
    return config;
  },
  
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  compress: false,
  poweredByHeader: false,
  
  // Output regular build (not standalone)
  // This reduces memory usage during build
  output: undefined,
  
  // Reduce concurrent page builds
  onDemandEntries: {
    maxInactiveAge: 1000 * 60,
    pagesBufferLength: 1, // Build 1 page at a time
  },
};

module.exports = nextConfig;