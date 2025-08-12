/**
 * Production Build Configuration
 * Industry-standard optimizations for 5-7 minute builds
 */

module.exports = {
  // Static pages that can be pre-rendered
  staticPages: [
    '/',
    '/about',
    '/pricing',
    '/features',
    '/blog',
    '/careers',
    '/press',
    '/privacy',
    '/terms',
    '/cookie-policy',
    '/legal/location-tracking-policy',
  ],
  
  // Pages that should use ISR (Incremental Static Regeneration)
  isrPages: {
    '/blog/[slug]': { revalidate: 3600 }, // 1 hour
    '/status': { revalidate: 60 }, // 1 minute
  },
  
  // Heavy components to load dynamically
  dynamicImports: {
    // Charts
    'recharts': ['@/components/charts', '@/app/dashboard/components/analytics'],
    'chart.js': ['@/components/SmartInsights', '@/app/dashboard/components/insights'],
    '@fullcalendar': ['@/components/calendar', '@/app/dashboard/components/scheduling'],
    
    // Large libraries
    'xlsx': ['@/components/import', '@/app/dashboard/components/data'],
    'jspdf': ['@/components/export', '@/app/api/payroll/export-report'],
    'react-leaflet': ['@/components/maps', '@/app/dashboard/components/location'],
    
    // Heavy UI components
    'react-datepicker': ['@/components/forms', '@/app/dashboard/components/inputs'],
    'react-color': ['@/components/customization', '@/app/dashboard/settings'],
  },
  
  // Build parallelization
  buildWorkers: {
    // API routes can be built in parallel
    apiRoutes: true,
    // Static pages can be built in parallel
    staticPages: true,
    // Number of concurrent workers
    concurrency: 4,
  },
  
  // Bundle size limits (in KB)
  bundleLimits: {
    // First load JS per page
    firstLoadJS: 150,
    // Individual chunk size
    chunkSize: 100,
    // Total page size
    totalPageSize: 250,
  },
  
  // Libraries to exclude from client bundles
  serverOnlyModules: [
    'pg',
    'redis',
    'ioredis',
    'jsonwebtoken',
    'bcrypt',
    '@prisma/client',
    'auth0',
    'stripe',
  ],
  
  // Caching strategies
  caching: {
    // Build cache
    buildCache: {
      // Cache Next.js build output
      '.next/cache': true,
      // Cache node_modules
      'node_modules/.cache': true,
      // Cache pnpm store
      '.pnpm-store': true,
    },
    
    // Runtime cache
    runtimeCache: {
      // API responses
      api: 300, // 5 minutes
      // Static assets
      static: 31536000, // 1 year
      // Images
      images: 86400, // 1 day
    },
  },
  
  // Optimization flags
  optimizations: {
    // Remove unused CSS
    removeUnusedCSS: true,
    // Tree shake icons
    treeShakeIcons: true,
    // Minify JSON files
    minifyJSON: true,
    // Optimize fonts
    optimizeFonts: true,
    // Remove source maps
    removeSourceMaps: true,
    // Enable SWC minification
    swcMinify: true,
  },
};