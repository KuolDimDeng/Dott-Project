// PostHog configuration
// The PostHog public key (phc_*) is designed to be public and client-side visible
// It can only send events, not read or modify data

export const posthogConfig = {
  // PostHog public key - this is safe to expose client-side
  // Configure domain restrictions in PostHog dashboard for additional security
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY || null,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  
  // Feature flags
  enabled: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
  capturePageviews: true,
  capturePageleaves: true,
  
  // Debug mode in development
  debug: process.env.NODE_ENV === 'development'
};

// Export individual values for convenience
export const POSTHOG_KEY = posthogConfig.key;
export const POSTHOG_HOST = posthogConfig.host;