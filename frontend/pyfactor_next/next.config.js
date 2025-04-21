/** @type {import('next').NextConfig} */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';
const isHttps = process.env.HTTPS === 'true';

// Log HTTPS settings for debugging
console.log(`[NextJS Config] HTTPS settings - env.HTTPS: ${process.env.HTTPS}, isHttps: ${isHttps}`);
console.log(`[NextJS Config] SSL files - CRT: ${process.env.SSL_CRT_FILE}, KEY: ${process.env.SSL_KEY_FILE}`);

// HTTPS configuration moved to package.json script instead of next.config.js
// The dev:https script should include --experimental-https which is how Next.js 13+ handles HTTPS

// Config focused on stability and compatibility
const nextConfig = {
  // Basic Next.js settings
  reactStrictMode: true,
  swcMinify: true,
  
  // Set pageExtensions at the top level instead of in experimental
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // Environment variables available on the client side
  env: {
    BACKEND_API_URL: process.env.BACKEND_API_URL || 'https://localhost:8000',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://localhost:8000',
    USE_DATABASE: process.env.USE_DATABASE === 'true',
    MOCK_DATA_DISABLED: process.env.MOCK_DATA_DISABLED === 'true',
    PROD_MODE: process.env.PROD_MODE === 'true',
    HTTPS_ENABLED: true // Force HTTPS to true since we're using SSL
  },
  
  // Handle API routes that should be proxied to the backend
  async rewrites() {
    const rewrites = [
      {
        source: '/api/:path*',
        destination: 'https://localhost:8000/api/:path*', // Proxy to Django backend over HTTPS
        basePath: false,
      },
    ];
    console.log(`[NextJS Config] Setting up API proxy rewrites to: https://localhost:8000/api/`);
    return rewrites;
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

    // Add SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  
  // Add HTTPS configuration to httpAgentOptions
  httpAgentOptions: {
    keepAlive: true,
    // Always allow self-signed certificates since we're using them locally
    rejectUnauthorized: false
  },
  
  // Update image optimization configuration
  images: {
    // Disable image optimization completely
    unoptimized: true,
    
    // Allow SVGs
    dangerouslyAllowSVG: true,
    
    // Set content security policy
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // Remote image domains
    domains: [
      'localhost',
      '127.0.0.1',
      'via.placeholder.com',
      'picsum.photos',
      'images.unsplash.com',
    ],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;

module.exports = {
  productionBrowserSourceMaps: true
};
