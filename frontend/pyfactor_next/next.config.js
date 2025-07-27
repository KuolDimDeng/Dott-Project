/** @type {import('next').NextConfig} */
const path = require('path');
const { withSentryConfig } = require('@sentry/nextjs');
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.dottapps\.com\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 // 24 hours
        },
        networkTimeoutSeconds: 10
      }
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
        }
      }
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
        }
      }
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
        }
      }
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-css-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 // 1 hour
        },
        networkTimeoutSeconds: 10
      }
    },
    {
      urlPattern: /\.(?:json|xml|csv)$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'static-data-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 // 1 hour
        },
        networkTimeoutSeconds: 10
      }
    },
    {
      urlPattern: /.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'others',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 // 1 hour
        },
        networkTimeoutSeconds: 10
      }
    }
  ]
});

// Optimized Next.js configuration for Render deployments
let BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// Ensure BACKEND_API_URL always has a protocol
if (BACKEND_API_URL && !BACKEND_API_URL.startsWith('http://') && !BACKEND_API_URL.startsWith('https://')) {
  BACKEND_API_URL = `https://${BACKEND_API_URL}`;
  console.log(`[Build] Added https:// protocol to BACKEND_API_URL: ${BACKEND_API_URL}`);
}

// Suppress build-time logging for faster builds
if (process.env.NODE_ENV === 'production' && !process.env.SENTRY_DEBUG) {
  console.log = () => {};
  console.debug = () => {};
}

const nextConfig = {
  // Basic settings
  reactStrictMode: true,
  trailingSlash: false,
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Compiler optimizations for faster builds
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Optimize for Render's infrastructure
  experimental: {
    // Server actions configuration (Next.js 15 format)
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['dottapps.com', 'www.dottapps.com']
    },
    
    // Enable module/chunk optimizations - expanded list
    optimizePackageImports: [
      'lodash',
      'date-fns',
      '@heroicons/react',
      '@phosphor-icons/react',
      'lucide-react',
      '@stripe/stripe-js',
      'recharts',
      'chart.js',
      '@fullcalendar/core',
      '@fullcalendar/react',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@emotion/react',
      '@emotion/styled',
      'react-hook-form',
      '@tanstack/react-query',
      'react-i18next',
      'i18next',
      '@sentry/nextjs',
      'react-chartjs-2',
      'react-table',
      'react-datepicker',
      'react-select-country-list',
      'formik',
      'yup',
      'zustand'
    ],
    
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
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SENTRY_DSN: 'https://74deffcfad997262710d99acb797fef8@o4509614361804800.ingest.us.sentry.io/4509614433304576',
    NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    APP_BASE_URL: process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL,
    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL,
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_SECRET: process.env.AUTH0_SECRET,
    // Claude API configuration for tax suggestions
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    CLAUDE_TAX_API_KEY: process.env.CLAUDE_TAX_API_KEY,
    CLAUDE_API_MODEL: process.env.CLAUDE_API_MODEL,
    CLAUDE_SMART_INSIGHTS_API_KEY: process.env.CLAUDE_SMART_INSIGHTS_API_KEY,
    CLAUDE_SMART_INSIGHTS_MODEL: process.env.CLAUDE_SMART_INSIGHTS_MODEL,
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
  webpack: (config, { isServer, dev, webpack }) => {
    // Fix "self is not defined" error for server-side builds
    if (isServer) {
      // Provide polyfill for 'self' global
      config.resolve.alias = {
        ...config.resolve.alias,
        self: path.resolve(__dirname, 'src/utils/webpack-self-polyfill.js'),
      };
      
      // Also inject polyfill at the beginning of server bundles
      config.plugins.push(
        new webpack.BannerPlugin({
          banner: 'if (typeof self === "undefined") { global.self = global; }',
          raw: true,
          entryOnly: false,
        })
      );
    }
    
    // Production optimizations
    if (!dev) {
      // Enable module concatenation
      config.optimization.concatenateModules = true;
      
      // Optimize chunk splitting for faster builds and smaller bundles
      config.optimization.splitChunks = {
        chunks: 'all',
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: false,
          vendors: false,
          // React framework
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|next)[\\/]/,
            priority: 50,
            enforce: true,
          },
          // Common vendor libraries
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            chunks: 'initial',
            priority: 20,
          },
          // Async-loaded heavy libraries
          charts: {
            name: 'charts',
            test: /[\\/]node_modules[\\/](recharts|chart\.js|react-chartjs)[\\/]/,
            chunks: 'async',
            priority: 30,
            reuseExistingChunk: true,
          },
          calendar: {
            name: 'calendar',
            test: /[\\/]node_modules[\\/](@fullcalendar)[\\/]/,
            chunks: 'async',
            priority: 30,
            reuseExistingChunk: true,
          },
          maps: {
            name: 'maps',
            test: /[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/,
            chunks: 'async',
            priority: 30,
            reuseExistingChunk: true,
          },
          excel: {
            name: 'excel',
            test: /[\\/]node_modules[\\/](xlsx|exceljs)[\\/]/,
            chunks: 'async',
            priority: 30,
            reuseExistingChunk: true,
          },
          pdf: {
            name: 'pdf',
            test: /[\\/]node_modules[\\/](jspdf|pdf-lib|@react-pdf)[\\/]/,
            chunks: 'async',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Common chunks
          commons: {
            name: 'commons',
            minChunks: 2,
            chunks: 'initial',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
      
      // Minimize main bundle
      config.optimization.minimize = true;
      
      // Disable source maps for faster builds
      config.devtool = false;
      
      // Use faster hashing algorithm
      config.output.hashFunction = 'xxhash64';
      
      // Optimize module IDs
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';
      
      // Enable aggressive code splitting
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Remove unused webpack plugins that slow down builds
      config.plugins = config.plugins.filter(
        plugin => {
          const name = plugin.constructor.name;
          return !['ForkTsCheckerWebpackPlugin', 'ESLintWebpackPlugin'].includes(name);
        }
      );
    }
    
    // Handle stubs (removed chart.js stubs to enable Smart Insights charts)
    config.resolve.alias = {
      ...config.resolve.alias,
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
    
    // Additional fix for self is not defined
    if (!isServer) {
      config.resolve.fallback.self = false;
    }

    // Exclude heavy dependencies
    config.externals = [
      ...(config.externals || []),
      'canvas',
      'jsdom',
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
      'www.dottapps.com',
      'via.placeholder.com',
      'images.unsplash.com',
      'cdn.dottapps.com',  // For future CDN usage
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.dottapps.com',
      },
    ],
  },
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  
  // Security headers and caching
  async headers() {
    return [
      // Cache static assets aggressively
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/:all*(js|css|jpg|jpeg|png|gif|ico|woff|woff2|svg)',
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
            value: 'max-age=63072000; includeSubDomains; preload'
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
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts - still need unsafe-inline for Next.js
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://auth.dottapps.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://js.stripe.com https://client.crisp.chat https://widget.crisp.chat https://cdn.plaid.com https://cdn.posthog.com https://app.posthog.com https://*.posthog.com https://maps.googleapis.com https://maps.gstatic.com",
              // Workers - needed for PostHog session recording
              "worker-src 'self' blob: https://app.posthog.com https://*.posthog.com",
              // Styles
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://client.crisp.chat",
              // Fonts
              "font-src 'self' data: https://fonts.gstatic.com https://client.crisp.chat",
              // Images
              "img-src 'self' data: https: blob: https://*.dottapps.com https://maps.googleapis.com https://maps.gstatic.com",
              // Connections - add Cloudflare domains and Sentry
              "connect-src 'self' https://*.auth0.com https://*.stripe.com https://*.googleapis.com wss://*.crisp.chat https://*.crisp.chat https://api.stripe.com https://api.dottapps.com https://auth.dottapps.com https://dottapps.com https://www.dottapps.com https://ipapi.co https://api.country.is https://ipinfo.io https://ipgeolocation.io https://*.plaid.com https://app.posthog.com https://*.posthog.com https://*.cloudflare.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
              // Frames
              "frame-src 'self' https://accounts.google.com https://auth.dottapps.com https://dev-cbyy63jovi6zrcos.us.auth0.com https://js.stripe.com https://client.crisp.chat https://*.plaid.com",
              // Objects
              "object-src 'none'",
              // Base URI
              "base-uri 'self'",
              // Form actions
              "form-action 'self' https://auth.dottapps.com https://dottapps.com https://www.dottapps.com",
              // Upgrade insecure requests
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      },
      // API routes should not be cached
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
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

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production
  silent: true,
  dryRun: process.env.NODE_ENV !== 'production',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
};

// Check if Sentry should be enabled
const sentryDSN = process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://74deffcfad997262710d99acb797fef8@o4509614361804800.ingest.us.sentry.io/4509614433304576';
const enableSentry = !!sentryDSN;

console.log('[Build] Sentry configuration:');
console.log('[Build] - DSN from env:', process.env.NEXT_PUBLIC_SENTRY_DSN ? 'Yes' : 'No (using fallback)');
console.log('[Build] - Sentry enabled:', enableSentry);

// Export with PWA and optionally Sentry
const configWithPWA = withPWA(nextConfig);

module.exports = enableSentry 
  ? withSentryConfig(configWithPWA, sentryWebpackPluginOptions)
  : configWithPWA;