// PostHog configuration
// This file provides PostHog configuration with fallbacks

export const posthogConfig = {
  // Try environment variables first, then use hardcoded values
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_Ipk4w3yYAtCvGfauUWgemvQOqSmxX2xqmtYAnuMcAgX',
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  
  // Feature flags
  enabled: true,
  capturePageviews: true,
  capturePageleaves: true,
  
  // Debug mode in development
  debug: process.env.NODE_ENV === 'development'
};

// Export individual values for convenience
export const POSTHOG_KEY = posthogConfig.key;
export const POSTHOG_HOST = posthogConfig.host;