/**
 * Static Page Configuration
 * Pages listed here will be pre-rendered at build time for instant loading
 */

export const staticPageConfig = {
  // Public pages - no authentication required
  public: [
    '/',
    '/about',
    '/pricing', 
    '/features',
    '/careers',
    '/press',
    '/privacy',
    '/terms',
    '/cookie-policy',
    '/legal/location-tracking-policy',
    '/blog',
    '/mobile',
    '/mobile/landing',
  ],
  
  // Pages with ISR (Incremental Static Regeneration)
  isr: {
    '/status': 60, // Revalidate every minute
    '/blog/[slug]': 3600, // Revalidate every hour
  },
  
  // Force dynamic (exclude from static generation)
  dynamic: [
    '/dashboard',
    '/profile',
    '/auth',
    '/onboarding',
    '/api',
    '/[tenantId]', // All tenant-specific routes
  ]
};

// Export for build optimization
export const shouldBeStatic = (pathname) => {
  // Check if explicitly static
  if (staticPageConfig.public.includes(pathname)) return true;
  
  // Check if ISR
  if (Object.keys(staticPageConfig.isr).includes(pathname)) return true;
  
  // Check if explicitly dynamic
  if (staticPageConfig.dynamic.some(pattern => pathname.startsWith(pattern))) return false;
  
  // Default to static for better performance
  return !pathname.includes('[') && !pathname.startsWith('/api');
};