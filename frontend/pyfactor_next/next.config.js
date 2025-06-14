/** @type {import('next').NextConfig} */
const path = require('path');

// Get environment variables with fallbacks
const BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// Debug: Print all Auth0 environment variables during Next.js build - Fixed AWS JWT dependency
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

// Debug: Print Stripe environment variables during Next.js build
console.log("\n🚨🚨🚨 STRIPE ENVIRONMENT CHECK AT BUILD TIME 🚨🚨🚨");
console.log("💳 [DEBUG] Next.js Build - Stripe Environment Variables:");
console.log(`   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 20) + '...' : '❌ NOT_SET - THIS IS THE PROBLEM!'}`);
console.log(`   STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 15) + '...' : '❌ NOT_SET'}`);
console.log(`   Build Time: ${new Date().toISOString()}`);
console.log("🚨🚨🚨 END STRIPE CHECK 🚨🚨🚨\n");

const nextConfig = {
  // Basic Next.js settings optimized for development speed
  reactStrictMode: true,
  trailingSlash: false,
  
  // Enable standalone output when using Render config
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  
  // Ensure Auth0 module is included in standalone build
  experimental: {
    outputFileTracingIncludes: {
      '/api/auth/[auth0]': [
        './node_modules/@auth0/**/*',
        './node_modules/openid-client/**/*',
        './node_modules/jose/**/*',
        './node_modules/oauth4webapi/**/*',
      ],
    },
  },
  
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
    // Stripe environment variables
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    // Auth0 SDK required variables
    APP_BASE_URL: process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL,
    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL,
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_SECRET: process.env.AUTH0_SECRET,
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
            value: [
              "default-src 'self'",
              // Remove unsafe-inline and unsafe-eval for scripts - use strict CSP
              "script-src 'self' https://accounts.google.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://js.stripe.com https://client.crisp.chat https://widget.crisp.chat",
              // Allow inline styles for now (can be removed later with CSS refactoring)
              "style-src 'self' 'unsafe-inline' https://client.crisp.chat",
              "font-src 'self' data: https://fonts.gstatic.com https://client.crisp.chat",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://api.dottapps.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://auth.dottapps.com https://accounts.google.com https://api.stripe.com https://api.country.is https://ipinfo.io https://client.crisp.chat https://widget.api.crisp.chat wss://client.relay.crisp.chat",
              "frame-src 'self' https://accounts.google.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://js.stripe.com https://auth.dottapps.com https://client.crisp.chat",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      }
    ];
  },

  // API rewrites - commented out as we're using API route proxy
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/backend-health',
  //       destination: `${BACKEND_API_URL}/health/`
  //     },
  //     {
  //       source: '/api/backend/:path*',
  //       destination: `${BACKEND_API_URL}/:path*`
  //     }
  //   ];
  // },

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
