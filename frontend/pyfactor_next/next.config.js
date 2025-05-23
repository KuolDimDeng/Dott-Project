/** @type {import('next').NextConfig} */
const path = require('path');

// Get environment variables with fallbacks
const BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

const nextConfig = {
  // Basic Next.js settings optimized for Vercel deployment
  reactStrictMode: true,
  trailingSlash: false,
  
  // Page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // ESLint and TypeScript configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Experimental features
  experimental: {
    forceSwcTransforms: true,
  },
  
  // Webpack configuration
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
      net: false,
      tls: false,
    };

    // Exclude canvas from being processed by webpack
    config.externals = [...(config.externals || []), { canvas: 'commonjs canvas' }];

    // SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  
  // Image optimization for Vercel
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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dottapps.com',
      },
      {
        protocol: 'https',
        hostname: 'dottapps.com',
      },
    ],
  },
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ]
      }
    ];
  },

  // API rewrites for backend communication
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*'
      },
      {
        source: '/api/onboarding/token-exchange',
        destination: `${BACKEND_API_URL}/api/onboarding/token-exchange`
      },
      {
        source: '/api/:path*',
        destination: `${BACKEND_API_URL}/api/:path*`
      }
    ];
  },

  // Redirects for common routes
  async redirects() {
    return [
      {
        source: '/onboarding/components/stepundefined',
        destination: '/onboarding/step1',
        permanent: false
      },
      {
        source: '/onboarding/components/:path*',
        destination: '/onboarding/step1',
        permanent: false
      }
    ];
  },
};

module.exports = nextConfig; /* Trigger deployment - Fri May 23 16:15:39 MDT 2025 */
