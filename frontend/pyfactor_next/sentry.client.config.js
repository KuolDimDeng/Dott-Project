// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { initSentryInstrumentation } from '@/utils/sentry-web-vitals';

// Log initialization
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://74deffcfad997262710d99acb797fef8@o4509614361804800.ingest.us.sentry.io/4509614433304576';
console.log('[Sentry Client] Starting initialization...');
console.log('[Sentry Client] DSN from env:', process.env.NEXT_PUBLIC_SENTRY_DSN ? 'Yes' : 'No');
console.log('[Sentry Client] Using DSN:', DSN);
console.log('[Sentry Client] Environment:', process.env.NODE_ENV);
console.log('[Sentry Client] Trace Sample Rate:', process.env.NODE_ENV === 'production' ? 0.1 : 1.0);
console.log('[Sentry Client] Profile Sample Rate:', process.env.NODE_ENV === 'production' ? 0.05 : 1.0);

// Initialize Sentry for the browser
Sentry.init({
  dsn: DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Profiling sample rate (production should be lower to control costs)
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: true,

  // Enable session replay
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  integrations: [
    // Browser Tracing integration with enhanced options
    Sentry.browserTracingIntegration({
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/api\.dottapps\.com/,
        /^https:\/\/dottapps\.com/,
        /^http:\/\/localhost:3000/,
        /^https:\/\/127\.0\.0\.1/,
      ],
      // Enable tracing for fetch and XHR requests
      traceFetch: true,
      traceXHR: true,
      // Track route changes
      routingInstrumentation: Sentry.nextRouterInstrumentation,
      // Track components
      trackComponents: true,
      // Track idle transactions
      idleTimeout: 5000,
      // Track long animations
      enableLongAnimationFrame: true,
      // Track INP (Interaction to Next Paint)
      enableInp: true,
      // Additional tracing origins
      tracingOrigins: [
        'localhost',
        /^https:\/\/api\.dottapps\.com/,
        /^https:\/\/dottapps\.com/,
      ],
    }),
    // Replay integration for session recording
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      // Capture slow clicks
      slowClickTimeout: 3000,
      // Capture network details
      networkDetailAllowUrls: [
        'https://api.dottapps.com',
        'https://dottapps.com',
      ],
      // Capture console logs in replays
      collectFonts: true,
    }),
    // Capture Console Errors
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
    // Session tracking
    Sentry.sessionTimingIntegration(),
    // Browser profiling (requires @sentry/profiling-node)
    Sentry.browserProfilingIntegration(),
    // HTTP client errors
    Sentry.httpClientIntegration({
      failedRequestStatusCodes: [400, 599],
      failedRequestTargets: [
        'https://api.dottapps.com',
      ],
    }),
  ],

  // Enable automatic session tracking
  autoSessionTracking: true,
  
  // Session tracking configuration
  sessionTrackingIntervalMillis: 30000,

  // Performance Monitoring
  tracingOptions: {
    trackComponents: true,
  },

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Transport options for better performance
  transportOptions: {
    // Keep connections alive
    keepalive: true,
  },

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

  // Before sending transaction
  beforeSendTransaction(transaction) {
    // Add custom context to transactions
    if (transaction.contexts?.trace?.op === 'navigation') {
      transaction.setTag('navigation.type', 'page-load');
    }
    return transaction;
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

  // Ignore specific transactions
  ignoreTransactions: [
    // Health check endpoints
    '/api/health',
    '/api/metrics',
    // Static assets
    '/_next/static',
  ],

  // Only send errors from our own scripts
  allowUrls: [
    /https:\/\/dottapps\.com/,
    /https:\/\/www\.dottapps\.com/,
    /https:\/\/api\.dottapps\.com/,
    // Also allow localhost in development
    /http:\/\/localhost:3000/,
  ],

  // Default integrations to disable (if needed)
  defaultIntegrations: false,
  
  // Sampling configuration
  sampleRate: process.env.NODE_ENV === 'production' ? 0.25 : 1.0,
  
  // Callback to verify initialization
  beforeSend(event, hint) {
    console.log('[Sentry Client] Event being sent:', event.type || 'error', event);
    return event;
  },

  // Log when transactions are created
  beforeSendTransaction(transaction) {
    console.log('[Sentry Client] Transaction being sent:', transaction.transaction, transaction);
    return transaction;
  }
});

// Verify Sentry is initialized
console.log('[Sentry Client] Initialization complete');
console.log('[Sentry Client] Current hub active:', Sentry.getCurrentHub().getClient() !== undefined);

// Initialize custom Web Vitals and instrumentation after Sentry is ready
if (typeof window !== 'undefined') {
  // Add a global function to test Sentry
  window.testSentry = () => {
    console.log('[Sentry Client] Test error triggered');
    try {
      Sentry.captureException(new Error('Test error from production'));
      Sentry.captureMessage('Test message from production', 'info');
      console.log('[Sentry Client] Test events sent successfully');
    } catch (error) {
      console.error('[Sentry Client] Failed to send test events:', error);
    }
  };
  
  console.log('[Sentry Client] Test function available: window.testSentry()');
  
  // Wait for the page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSentryInstrumentation);
  } else {
    initSentryInstrumentation();
  }
  
  // Send a breadcrumb when page loads
  window.addEventListener('load', () => {
    console.log('[Sentry Client] Page loaded, adding breadcrumb');
    Sentry.addBreadcrumb({
      message: 'Page loaded successfully',
      level: 'info',
      category: 'navigation',
      data: {
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    });
  });
}