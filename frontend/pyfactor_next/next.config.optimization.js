module.exports = {
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      // Industry standard: Merge small chunks to reduce HTTP requests
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxAsyncRequests: 6,
        maxInitialRequests: 4,
        cacheGroups: {
          default: false,
          vendors: false,
          // Framework chunk
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription|next)[\\/]/,
            priority: 40,
            chunks: 'all',
          },
          // Main vendor chunk
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            priority: 30,
            chunks: 'all',
            reuseExistingChunk: true,
          },
          // Application commons
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
            chunks: 'all',
            reuseExistingChunk: true,
          },
          // Dashboard specific
          dashboard: {
            name: 'dashboard',
            test: /[\\/]src[\\/](app|components)[\\/]dashboard[\\/]/,
            priority: 15,
            chunks: 'all',
            enforce: true,
          },
        },
      };
      
      // Limit parallel requests
      config.optimization.runtimeChunk = 'single';
    }
    return config;
  },
};
