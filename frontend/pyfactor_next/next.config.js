/** @type {import('next').NextConfig} */
const path = require('path');

// Get environment variables with fallbacks
const BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// Debug: Print all Auth0 environment variables during Next.js build
console.log("🔍 [DEBUG] Next.js Build - Auth0 Environment Variables:");
console.log(`   AUTH0_SECRET: ${process.env.AUTH0_SECRET ? process.env.AUTH0_SECRET.substring(0, 8) + '...' : 'NOT_SET'}`);
console.log(`   AUTH0_BASE_URL: ${process.env.AUTH0_BASE_URL || 'NOT_SET'}`);
console.log(`   AUTH0_ISSUER_BASE_URL: ${process.env.AUTH0_ISSUER_BASE_URL || 'NOT_SET'}`);
console.log(`   AUTH0_CLIENT_ID: ${process.env.AUTH0_CLIENT_ID || 'NOT_SET'}`);
console.log(`   AUTH0_CLIENT_SECRET: ${process.env.AUTH0_CLIENT_SECRET ? process.env.AUTH0_CLIENT_SECRET.substring(0, 8) + '...' : 'NOT_SET'}`);
console.log(`   AUTH0_AUDIENCE: ${process.env.AUTH0_AUDIENCE || 'NOT_SET'}`);
console.log(`   AUTH0_SCOPE: ${process.env.AUTH0_SCOPE || 'NOT_SET'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT_SET'}`);
console.log(`   VERCEL_ENV: ${process.env.VERCEL_ENV || 'NOT_SET'}`);

const nextConfig = {
  // Basic Next.js settings optimized for development speed
  reactStrictMode: true,
  trailingSlash: false,
  
  // Environment variables (workaround for dotenv package interference)
  env: {
    NEXT_PUBLIC_CRISP_WEBSITE_ID: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID,
    // Auth0 environment variables for authentication
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_AUDIENCE: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    // OAuth environment variables for Google Sign-In
    NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN,
    NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT,
    NEXT_PUBLIC_OAUTH_SCOPES: process.env.NEXT_PUBLIC_OAUTH_SCOPES,
  },
  
  // Page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // ESLint and TypeScript configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Webpack configuration for optimized builds
  webpack: (config, { isServer, dev }) => {
    // Development-specific optimizations
    if (dev) {
      // Reduce watch options to prevent excessive file watching
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
          '**/build/**',
        ],
      };
      
      // Optimize CSS processing in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

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
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://js.stripe.com; style-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.dottapps.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://accounts.google.com https://api.stripe.com https://auth.dottapps.com; frame-src 'self' https://accounts.google.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://js.stripe.com https://auth.dottapps.com; object-src 'none'; base-uri 'self'; form-action 'self';"
          }
        ]
      }
    ];
  },

  // UPDATED: API rewrites for global CloudFront distribution
  async rewrites() {
    return [
      // ENABLED: Global API with CloudFront (no rewrites needed - direct API calls)
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

module.exports = nextConfig;
