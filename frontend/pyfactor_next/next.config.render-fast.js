/** @type {import('next').NextConfig} */
const path = require('path');

// AGGRESSIVE OPTIMIZATION CONFIG FOR 5-7 MIN BUILDS
const nextConfig = {
  // Use SWC instead of Babel (3x faster)
  swcMinify: true,
  
  // Enable concurrent features
  experimental: {
    // Use Turbo for faster builds
    turbo: {
      resolveAlias: {
        // Remove unused imports at build time
        'aws-sdk': false,
        '@aws-sdk': false,
        'puppeteer': false,
        'puppeteer-core': false,
      },
    },
    
    // Optimize imports
    optimizePackageImports: [
      'lodash',
      'date-fns',
      '@heroicons/react',
      '@phosphor-icons/react',
      'lucide-react',
      '@stripe/stripe-js',
      'recharts',
      'chart.js',
      '@fullcalendar/core',
      '@fullcalendar/react',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@emotion/react',
      '@emotion/styled',
      'react-hook-form',
      '@tanstack/react-query',
      'react-i18next',
      'i18next'
    ],
    
    // Reduce memory and CPU usage
    workerThreads: false,
    cpus: 2,
    
    // Parallel routes compilation
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
  },
  
  // Output configuration
  output: 'standalone',
  cleanDistDir: true,
  
  // Disable features we don't need
  poweredByHeader: false,
  generateEtags: false,
  compress: false, // Let Cloudflare handle compression
  
  // Image optimization
  images: {
    unoptimized: true, // Skip image optimization
    disableStaticImages: true,
  },
  
  // Build optimizations
  productionBrowserSourceMaps: false,
  
  // Skip type checking and linting
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Minimal webpack config
  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      // Use faster hashing
      config.output.hashFunction = 'xxhash64';
      
      // Disable source maps completely
      config.devtool = false;
      
      // Aggressive minification
      config.optimization = {
        ...config.optimization,
        minimize: true,
        concatenateModules: true,
        usedExports: true,
        sideEffects: false,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        removeEmptyChunks: true,
        
        // Aggressive code splitting
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            default: false,
            vendors: false,
            // Only split large vendor chunks
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Common chunks
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
      
      // Remove unused modules
      config.plugins = config.plugins.filter(
        plugin => {
          const name = plugin.constructor.name;
          // Remove plugins that slow down builds
          return !['ForkTsCheckerWebpackPlugin', 'ESLintWebpackPlugin'].includes(name);
        }
      );
    }
    
    // Node.js polyfills (minimal)
    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      net: false,
      tls: false,
      child_process: false,
    };
    
    // External heavy packages
    if (!isServer) {
      config.externals = [
        ...(config.externals || []),
        'canvas',
        'jsdom',
      ];
    }
    
    // SVG support (minimal)
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });
    
    return config;
  },
  
  // Minimal headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
        ],
      },
    ];
  },
  
  // Minimal env vars
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
};

// Skip Sentry and PWA for faster builds
module.exports = nextConfig;