import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // You had this twice
  swcMinify: false, // Keep this if you need to use Babel

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Aliases configuration
    const baseDir = path.resolve(__dirname);
    config.resolve.alias = {
      ...config.resolve.alias,
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
    };

    // Source maps for development only
    if (process.env.NODE_ENV === 'development' && !isServer) {
      config.devtool = 'eval-source-map';
    }

    return config;
  },

  // Image configuration
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

  // Security headers
  async headers() {
    return [
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
    ];
  },

  // Experimental features - removed deprecated options
  experimental: {
    scrollRestoration: true,
    typedRoutes: true
  },

  // Environment configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Build configuration
  output: 'standalone',
  
  // Performance optimizations
  compress: true,
  
  // Disable source maps in production
  productionBrowserSourceMaps: false,
};

export default nextConfig;