/** @type {import('next').NextConfig} */
const path = require('path');

// Optimized Next.js configuration for Render deployments
const BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// Suppress build-time logging for faster builds
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.debug = () => {};
}

const nextConfig = {
  // Basic settings
  reactStrictMode: true,
  trailingSlash: false,
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // SWC is now the default in Next.js 13+
  
  // Optimize for Render's infrastructure
  experimental: {
    // Server actions configuration (Next.js 15 format)
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['dottapps.com', 'www.dottapps.com']
    },
    
    // Enable module/chunk optimizations
    optimizePackageImports: ['lodash', 'date-fns', '@heroicons/react'],
    
    // Reduce memory usage during build
    workerThreads: false,
    cpus: 2, // Limit CPU usage for Render
  },
  
  // Environment variables (minimal set)
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
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    APP_BASE_URL: process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL,
    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL,
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_SECRET: process.env.AUTH0_SECRET,
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
  
  // Optimized webpack config for Render
  webpack: (config, { isServer, dev }) => {
    // Production optimizations
    if (!dev) {
      // Enable module concatenation
      config.optimization.concatenateModules = true;
      
      // Optimize chunk splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test(module) {
              return module.size() > 160000 &&
                /node_modules[/\\]/.test(module.identifier());
            },
            name(module) {
              const hash = require('crypto')
                .createHash('sha1')
                .update(module.identifier())
                .digest('hex')
                .substring(0, 8);
              return `lib-${hash}`;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      };
      
      // Minimize main bundle
      config.optimization.minimize = true;
      
      // Disable source maps for faster builds
      config.devtool = false;
    }
    
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

    // Exclude canvas and other heavy dependencies
    config.externals = [
      ...(config.externals || []),
      { canvas: 'commonjs canvas' },
      'puppeteer',
      'puppeteer-core',
      'chrome-aws-lambda',
    ];

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
  
  // Security headers and caching
  async headers() {
    return [
      // Cache static assets
      {
        source: '/:all*(js|css|jpg|jpeg|png|gif|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Security headers for all routes
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
              "connect-src 'self' https://*.auth0.com https://*.stripe.com https://*.googleapis.com wss://*.crisp.chat https://*.crisp.chat https://api.stripe.com https://api.dottapps.com https://auth.dottapps.com https://ipapi.co https://api.country.is https://ipinfo.io https://ipgeolocation.io",
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
      // Redirect legacy tenant URLs to new format
      {
        source: '/tenant/:tenantId/dashboard',
        destination: '/:tenantId/dashboard',
        permanent: true
      },
      {
        source: '/tenant/:tenantId/dashboard/:path*',
        destination: '/:tenantId/dashboard/:path*',
        permanent: true
      },
      {
        source: '/tenant/:tenantId/:path*',
        destination: '/:tenantId/:path*',
        permanent: true
      },
      // Existing redirects
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