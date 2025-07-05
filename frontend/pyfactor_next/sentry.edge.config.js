// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Initialize Sentry for edge runtime
Sentry.init({
  dsn: 'https://74deffcfad997262710d99acb797fef8@o4509614361804800.ingest.us.sentry.io/4509614433304576',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Before sending an event to Sentry
  beforeSend(event, hint) {
    // Don't send errors in development unless explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.SENTRY_DEBUG) {
      return null;
    }
    
    return event;
  },
});