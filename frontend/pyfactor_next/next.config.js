/** @type {import('next').NextConfig} */
const path = require('path');

// Simpler config focused only on fixing the process/browser issue
const nextConfig = {
  // SWC compiler is enabled by default in Next.js 13+
  experimental: {
    forceSwcTransforms: true,
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add headers configuration to ensure proper MIME types
  async headers() {
    return [
      {
        source: '/_next/static/chunks/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      {
        source: '/_next/:path*.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
    ];
  },
  // We still need to increase JS timeout for chunk loading
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 60 * 1000,
    // Number of pages that should be kept simultaneously in memory
    pagesBufferLength: 5,
  },
  // Minimal webpack config that just focuses on fixing the process/browser issue
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Use our custom polyfill for process/browser
      const processBrowserPath = path.join(__dirname, 'src/utils/process-browser.js');
      const debugStubPath = path.join(__dirname, 'src/utils/debug-stub.js');
      
      // Add alias for process/browser and debug
      config.resolve.alias = {
        ...config.resolve.alias,
        'process/browser': processBrowserPath,
        'debug': debugStubPath, // Replace debug module with our stub
      };
      
      // Add basic fallbacks
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        process: processBrowserPath,
        // No other fallbacks to keep things simple
      };

      // Skip any optimizations for debug module, but don't use string-replace-loader
      if (Array.isArray(config.module.noParse)) {
        config.module.noParse.push(/debug/);
      } else {
        config.module.noParse = [/debug/];
      }

      // Configure module resolution for dynamic imports
      config.resolve.extensions = ['.js', '.jsx', '.json'];
      config.resolve.mainFields = ['browser', 'module', 'main'];

      // Add optimization for dynamic imports
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Ensure all files in src are treated as ES modules
      config.module.rules.push({
        test: /\.js$/,
        include: [path.resolve(__dirname, 'src')],
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        },
      });
    }
    
    return config;
  },
};

module.exports = nextConfig; 