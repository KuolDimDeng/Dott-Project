// next.config.mjs
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core configuration
  reactStrictMode: true,
  poweredByHeader: false,
  swcMinify: true,

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(process.cwd(), 'src'),
      '@app': path.join(process.cwd(), 'src/app'),
      '@components': path.join(process.cwd(), 'src/components'),
      '@layouts': path.join(process.cwd(), 'src/layouts'),
      '@styles': path.join(process.cwd(), 'src/styles'),
      '@lib': path.join(process.cwd(), 'src/lib'),
      '@utils': path.join(process.cwd(), 'src/utils'),
      '@hooks': path.join(process.cwd(), 'src/hooks'),
      '@contexts': path.join(process.cwd(), 'src/contexts'),
      '@providers': path.join(process.cwd(), 'src/providers'),
      '@dashboard': path.join(process.cwd(), 'src/app/dashboard'),
      '@auth': path.join(process.cwd(), 'src/app/auth'),
      '@onboarding': path.join(process.cwd(), 'src/app/onboarding'),
      '@api': path.join(process.cwd(), 'src/app/api'),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
        stream: false,
        zlib: false,
      };
    }

    return config;
  },

  // Image configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      }
    ]
  },

  // Headers configuration
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { 
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.crisp.chat https://client.crisp.chat https://*.stripe.com",
            "connect-src 'self' https://*.crisp.chat wss://*.crisp.chat http://127.0.0.1:8000 http://localhost:8000 https://*.stripe.com https://api.stripe.com https://cognito-idp.us-east-1.amazonaws.com",
            "img-src 'self' data: https://*.crisp.chat blob: https://*.googleusercontent.com https://*.stripe.com https://q.stripe.com",
            "style-src 'self' 'unsafe-inline' https://*.crisp.chat",
            "frame-src 'self' https://*.crisp.chat https://*.youtube.com https://youtube.com https://*.stripe.com",
            "child-src 'self' https://*.crisp.chat blob:",
            "font-src 'self' https://client.crisp.chat",
            "manifest-src 'self'",
            "worker-src 'self'"
          ].join('; ')
        },
      ],
    },
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : process.env.NEXT_PUBLIC_API_URL },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH' },
        { key: 'Access-Control-Allow-Headers', value: 'X-Request-ID, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Onboarding-Step' },
        { key: 'Access-Control-Expose-Headers', value: 'Set-Cookie' },
      ],
    }
  ],

  // Routing configuration
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
          has: [
            {
              type: 'query',
              key: 'path',
              value: '(?!auth/).*'
            }
          ]
        }
      ],
    
    };
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },

  // App Router features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000'],
    },
    serverComponentsExternalPackages: [],
  },

  // Output configuration
  output: 'standalone',
  distDir: '.next',
  generateEtags: true,
  compress: true,
};

export default nextConfig;
