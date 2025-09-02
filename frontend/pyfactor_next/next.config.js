/** @type {import('next').NextConfig} */

const nextConfig = {
  // Static export for mobile apps
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true
  },
  
  // Add trailing slashes for better compatibility
  trailingSlash: true,
  
  // Basic settings
  reactStrictMode: true,
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  
  // Environment variables for the mobile app
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com',
    NEXT_PUBLIC_ENVIRONMENT: 'mobile',
    NEXT_PUBLIC_BASE_URL: 'https://app.dottapps.com'
  }
};

module.exports = nextConfig;