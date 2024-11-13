import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  swcMinify: false, // Disable SWC to use Babel

  // Simplified webpack configuration
  webpack: (config) => {
    // Keep alias configuration but simplify
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@components': path.resolve(__dirname, 'src/app/components'),
      '@layouts': path.resolve(__dirname, 'src/app/layouts'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@contexts': path.resolve(__dirname, 'src/contexts'),
      '@providers': path.resolve(__dirname, 'src/providers'),
      '@dashboard': path.resolve(__dirname, 'src/app/dashboard'),
      '@auth': path.resolve(__dirname, 'src/app/auth'),
      '@onboarding': path.resolve(__dirname, 'src/app/onboarding'),
      '@api': path.resolve(__dirname, 'src/app/api'),
    };

    return config;
  },

  // Basic image configuration
  images: {
    domains: ['localhost', '127.0.0.1', 'lh3.googleusercontent.com'],
    remotePatterns: [
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

  // Basic security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ],
      }
    ];
  },

  // Basic experimental features
  experimental: {
    scrollRestoration: true
  },

  // Environment configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Output configuration
  output: 'standalone',
};

export default nextConfig;