/** @type {import('next').NextConfig} */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// Config focused on stability and compatibility
const nextConfig = {
  // Basic Next.js settings
  poweredByHeader: false,
  reactStrictMode: false, // Disable strict mode to reduce memory pressure
  
  // Add API rewrites to handle CORS issues
  async rewrites() {
    return [
      // Proxy requests to localhost:8000
      {
        source: '/backend/:path*',
        destination: 'http://localhost:8000/:path*',
      },
      // Proxy requests to Python API server
      {
        source: '/api/profile/:path*',
        destination: 'http://localhost:8000/api/profile/:path*',
      },
      {
        source: '/api/customers/:path*',
        destination: 'http://localhost:8000/api/customers/:path*',
      },
      {
        source: '/api/products/:path*',
        destination: 'http://localhost:8000/api/products/:path*',
      },
      {
        source: '/api/services/:path*',
        destination: 'http://localhost:8000/api/services/:path*',
      },
      {
        source: '/api/invoices/:path*',
        destination: 'http://localhost:8000/api/invoices/:path*',
      },
      {
        source: '/api/vendors/:path*',
        destination: 'http://localhost:8000/api/vendors/:path*',
      },
      {
        source: '/api/bills/:path*',
        destination: 'http://localhost:8000/api/bills/:path*',
      }
    ];
  },
  
  // Webpack config focusing on pure CommonJS for stability
  webpack: (config, { isServer, dev }) => {
    // Create stub for datepicker CSS
    config.module.rules.push({
      test: /react-datepicker\/dist\/react-datepicker\.css$/,
      use: 'null-loader',
    });

    // Set up aliases for problematic modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'chart.js': path.resolve(__dirname, 'src/utils/stubs/chart-stub.js'),
      'react-chartjs-2': path.resolve(__dirname, 'src/utils/stubs/react-chartjs-2-stub.js'),
      'react-datepicker': path.resolve(__dirname, 'src/utils/stubs/datepicker-stub.js'),
      'react-datepicker/dist/react-datepicker.css': path.resolve(__dirname, 'src/utils/stubs/empty.css'),
    };

    // Handle CSS files
    if (!isServer) {
      // Force CSS extraction at the top level
      const miniCssExtractPlugin = new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
        ignoreOrder: true, // Prevents order warnings with CSS modules
      });

      // Ensure the plugin is added only once
      const hasPlugin = config.plugins.some(
        plugin => plugin instanceof MiniCssExtractPlugin
      );
      
      if (!hasPlugin) {
        config.plugins.push(miniCssExtractPlugin);
      }
    }

    // Fix Node.js polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };

    return config;
  },
  
  images: {
    domains: ['localhost', '127.0.0.1'],
  },
};

module.exports = nextConfig; 