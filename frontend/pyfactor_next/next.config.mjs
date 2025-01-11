
///Users/kuoldeng/projectx/frontend/pyfactor_next/next.config.mjs
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  swcMinify: false,

  webpack: (config, { isServer }) => {
    // Handle PDF dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
      '@': path.join(process.cwd(), 'src'),

    }

    // Base directory for aliases
    const baseDir = process.cwd();

    // Path aliases
    Object.assign(config.resolve.alias, {
      '@': path.join(baseDir, 'src'),
      '@app': path.join(baseDir, 'src/app'),
      '@components': path.join(baseDir, 'src/components'),
      '@layouts': path.join(baseDir, 'src/layouts'),
      '@styles': path.join(baseDir, 'src/styles'),
      '@lib': path.join(baseDir, 'src/lib'),
      '@utils': path.join(baseDir, 'src/utils'),
      '@hooks': path.join(baseDir, 'src/hooks'),
      '@contexts': path.join(baseDir, 'src/contexts'),
      '@providers': path.join(baseDir, 'src/providers'),
      '@dashboard': path.join(baseDir, 'src/app/dashboard'),
      '@auth': path.join(baseDir, 'src/app/auth'),
      '@onboarding': path.join(baseDir, 'src/app/onboarding'),
      '@api': path.join(baseDir, 'src/app/api'),
    });

    // Development source maps
    if (process.env.NODE_ENV === 'development' && !isServer) {
      config.devtool = 'eval-source-map';
    }

      // Add this for recharts support
  if (!isServer) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      stream: false,
      zlib: false,
    };
  }


    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/static/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/static/**',
      }
    ]
  },

  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
      ],
    }
  ],

  experimental: {
    scrollRestoration: true,
    typedRoutes: true
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  output: 'standalone',
  compress: true,
  productionBrowserSourceMaps: false,
};

export default nextConfig;