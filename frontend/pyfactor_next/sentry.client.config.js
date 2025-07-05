// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Initialize Sentry for the browser
Sentry.init({
  dsn: 'https://860a81d8cdd7fe266706e3bba9138feb@o4509614361804800.ingest.us.sentry.io/4509614365343744',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable session replay
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  integrations: [
    // Browser Tracing integration
    Sentry.browserTracingIntegration({
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/api\.dottapps\.com/,
        /^https:\/\/dottapps\.com/,
      ],
    }),
    // Replay integration for session recording
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance Monitoring
  tracingOptions: {
    trackComponents: true,
  },

  // Capture Console Errors
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
  ],

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Before sending an event to Sentry
  beforeSend(event, hint) {
    // Filter out specific errors if needed
    if (event.exception) {
      const error = hint.originalException;
      // Don't send network errors in development
      if (process.env.NODE_ENV !== 'production' && error?.name === 'NetworkError') {
        return null;
      }
    }
    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random network errors
    'Network request failed',
    'NetworkError',
    'Failed to fetch',
    // Resize observer errors (common and usually harmless)
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Common browser errors
    'Non-Error promise rejection captured',
    // Auth0 errors that are handled
    'login_required',
    'consent_required',
  ],

  // Only send errors from our own scripts
  allowUrls: [
    /https:\/\/dottapps\.com/,
    /https:\/\/www\.dottapps\.com/,
    /https:\/\/api\.dottapps\.com/,
  ],
});