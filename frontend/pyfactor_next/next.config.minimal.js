/** @type {import('next').NextConfig} */
const path = require('path');

// MINIMAL CONFIG FOR MEMORY-CONSTRAINED BUILDS
const nextConfig = {
  reactStrictMode: false, // Disable to save memory
  output: 'standalone',
  
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['dottapps.com', 'www.dottapps.com']
    },
    
    // Disable all optimizations to reduce memory
    optimizePackageImports: [], // Disabled
    workerThreads: false,
    cpus: 1,
    webpackBuildWorker: false,
  },
  
  // Minimal env vars
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  
  // Skip all checks
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable source maps
  productionBrowserSourceMaps: false,
  
  // Minimal webpack config
  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      // Disable all optimizations to save memory
      config.optimization.minimize = false;
      config.optimization.concatenateModules = false;
      config.optimization.splitChunks = false;
      config.optimization.runtimeChunk = false;
      config.devtool = false;
    }
    
    // Node polyfills
    config.resolve.fallback = {
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
  
  // Skip PWA
  swcMinify: false,
};

module.exports = nextConfig;