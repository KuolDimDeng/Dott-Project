/** @type {import('next').NextConfig} */

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

module.exports = nextConfig;
