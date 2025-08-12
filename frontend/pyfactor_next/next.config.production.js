/** @type {import('next').NextConfig} */
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://api.dottapps.com';

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  swcMinify: true,
  
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Use default SWC minifier
      config.optimization.minimize = true;
      
      // Optimize chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          react: {
            name: 'react',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          },
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'https://app.dottapps.com',
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  
  async rewrites() {
    return [{
      source: '/api/backend/:path*',
      destination: `${BACKEND_API_URL}/:path*`
    }];
  },
};

module.exports = nextConfig;
