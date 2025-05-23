/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Basic Next.js settings optimized for Vercel deployment
  reactStrictMode: true,
  
  // Remove static export for Vercel SSR support
  // output: 'export',
  trailingSlash: false,
  
  // Standard Next.js build output
  distDir: '.next',
  
  // Page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // Environment variables for production
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production',
    BACKEND_API_URL: process.env.BACKEND_API_URL || 'https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production',
    USE_DATABASE: 'true',
    MOCK_DATA_DISABLED: 'true',
    PROD_MODE: 'true',
  },
  
  // ESLint and TypeScript configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Experimental features for SWC transforms
  experimental: {
    forceSwcTransforms: true,
  },
  
  // Webpack configuration optimized for production
  webpack: (config, { isServer }) => {
    // Handle problematic modules with stubs
    config.resolve.alias = {
      ...config.resolve.alias,
      'chart.js': path.resolve(__dirname, 'src/utils/stubs/chart-stub.js'),
      'react-chartjs-2': path.resolve(__dirname, 'src/utils/stubs/react-chartjs-2-stub.js'),
      'react-datepicker': path.resolve(__dirname, 'src/utils/stubs/datepicker-stub.js'),
    };

    // Node.js polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };

    // SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  
  // Image optimization for production
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: [
      'api.dottapps.com',
      'dottapps.com',
      'via.placeholder.com',
      'images.unsplash.com',
    ],
  },
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  
  // Headers not supported with static export
  // Security headers would need to be configured at S3/CloudFront level
};

module.exports = nextConfig; 