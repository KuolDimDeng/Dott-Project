/** @type {import('next').NextConfig} */
const path = require('path');

// Render-specific Next.js configuration
const BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

const nextConfig = {
  // Basic settings
  reactStrictMode: true,
  trailingSlash: false,
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Disable SWC minification for Render (use Terser instead)
  swcMinify: false,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_CRISP_WEBSITE_ID: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID,
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_AUDIENCE: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN,
    NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT,
    NEXT_PUBLIC_OAUTH_SCOPES: process.env.NEXT_PUBLIC_OAUTH_SCOPES,
  },
  
  // Disable experimental features that might use eval
  experimental: {
    runtime: undefined,
    serverActions: false,
  },
  
  // Page extensions
  pageExtensions: ['js', 'jsx'],
  
  // Ignore errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Simplified webpack config for Render
  webpack: (config, { isServer }) => {
    // Handle stubs
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

    // Exclude canvas
    config.externals = [...(config.externals || []), { canvas: 'commonjs canvas' }];

    // SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  
  // Disable image optimization for Render
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
  
  // Simplified headers without complex CSP
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
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ]
      }
    ];
  },

  // API rewrites
  async rewrites() {
    return [
      {
        source: '/api/backend-health',
        destination: `${BACKEND_API_URL}/health/`
      },
      {
        source: '/api/backend/:path*',
        destination: `${BACKEND_API_URL}/:path*`
      }
    ];
  },

  // Redirects
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

module.exports = nextConfig;