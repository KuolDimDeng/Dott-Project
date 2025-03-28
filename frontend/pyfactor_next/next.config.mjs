/** @type {import('next').NextConfig} */
import i18nConfig from './next-i18next.config.mjs';

const nextConfig = {
  // i18n is handled by middleware.js and i18n.js for App Router
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001'],
    },
  },
  // Remove env property as NEXT_PUBLIC_ variables are automatically exposed
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    // Exclude canvas from being processed by webpack
    config.externals = [...(config.externals || []), { canvas: 'commonjs canvas' }];
    
    return config;
  },
  // Add cross-origin isolation headers
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
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      // Skip redirecting inventory/products to the backend so our Next.js API can handle it
      {
        source: '/api/inventory/products/:path*',
        destination: '/api/inventory/products/:path*',
      },
      // All other API routes redirect to backend
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*'
      }
    ];
  }
};

export default nextConfig;