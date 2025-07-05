// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Initialize Sentry for the server
Sentry.init({
  dsn: 'https://860a81d8cdd7fe266706e3bba9138feb@o4509614361804800.ingest.us.sentry.io/4509614365343744',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: process.env.NODE_ENV === 'development',

  // Performance monitoring
  integrations: [
    // Automatically instrument Node.js libraries and frameworks
    ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
  ],

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Before sending an event to Sentry
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.cookies) {
      // Remove sensitive cookies
      delete event.request.cookies.sid;
      delete event.request.cookies.auth_token;
    }
    
    // Don't send errors in development unless explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.SENTRY_DEBUG) {
      return null;
    }
    
    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Common Next.js errors
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    // API errors that are expected
    'UnauthorizedError',
    'ValidationError',
  ],

  // Server-specific options
  autoSessionTracking: true,
  
  // Capture unhandled promise rejections
  onUnhandledRejection: 'warn',
});