/** @type {import('next').NextConfig} */

const nextConfig = {
  // Use static export only for mobile builds
  // output: 'export',  // Commented out for regular builds
  
  // Image optimization settings
  images: {
    unoptimized: process.env.BUILD_TARGET === 'mobile' ? true : false
  },
  
  // Add trailing slashes for better compatibility
  trailingSlash: true,
  
  // Basic settings
  reactStrictMode: true,
  
  // Disable ESLint during production builds
  eslint: {
    ignoreDuringBuilds: true
  },
  
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