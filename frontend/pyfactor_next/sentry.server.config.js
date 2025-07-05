// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry for the server
Sentry.init({
  dsn: 'https://74deffcfad997262710d99acb797fef8@o4509614361804800.ingest.us.sentry.io/4509614433304576',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Profiling sample rate (production should be lower to control costs)
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: process.env.NODE_ENV === 'development',

  // Performance monitoring
  integrations: [
    // Automatically instrument Node.js libraries and frameworks
    ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
    // Add Node.js profiling
    new ProfilingIntegration(),
    // Prisma ORM integration
    Sentry.prismaIntegration(),
    // GraphQL integration
    Sentry.graphqlIntegration({
      ignoreResolveSpans: false,
      ignoreTrivialResolveSpans: true,
    }),
    // HTTP integration for tracking outgoing requests
    Sentry.httpIntegration({
      tracing: true,
      breadcrumbs: true,
    }),
    // Console integration
    Sentry.consoleIntegration(),
    // Context lines integration (shows code context in errors)
    Sentry.contextLinesIntegration({
      frameContextLines: 7,
    }),
    // Local variables integration (captures local variables)
    Sentry.localVariablesIntegration({
      captureAllExceptions: true,
    }),
    // Request data integration
    Sentry.requestDataIntegration({
      include: {
        cookies: true,
        data: true,
        headers: true,
        ip: true,
        query_string: true,
        url: true,
        user: true,
      },
    }),
  ],

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Enable automatic session tracking
  autoSessionTracking: true,

  // Capture unhandled promise rejections
  onUnhandledRejection: 'error',

  // Server name (useful for identifying different server instances)
  serverName: process.env.RENDER_SERVICE_NAME || 'dott-front',

  // Transaction name
  transactionNamingScheme: 'path',

  // Before sending an event to Sentry
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.cookies) {
      // Remove sensitive cookies
      delete event.request.cookies.sid;
      delete event.request.cookies.auth_token;
      delete event.request.cookies['connect.sid'];
    }

    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }

    // Remove sensitive data from request body
    if (event.request?.data) {
      // Remove password fields
      if (typeof event.request.data === 'object') {
        delete event.request.data.password;
        delete event.request.data.confirmPassword;
        delete event.request.data.oldPassword;
        delete event.request.data.newPassword;
      }
    }
    
    // Don't send errors in development unless explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.SENTRY_DEBUG) {
      return null;
    }
    
    return event;
  },

  // Before sending transaction
  beforeSendTransaction(transaction) {
    // Add custom tags to transactions
    if (transaction.transaction?.includes('/api/')) {
      transaction.setTag('transaction.type', 'api');
    } else {
      transaction.setTag('transaction.type', 'page');
    }

    // Track slow transactions
    const duration = transaction.timestamp - transaction.start_timestamp;
    if (duration > 3) {
      transaction.setTag('performance.slow', true);
    }

    return transaction;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Common Next.js errors
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    // API errors that are expected
    'UnauthorizedError',
    'ValidationError',
    'AuthenticationError',
    // Database errors that are handled
    'PrismaClientKnownRequestError',
    // Common Node.js errors
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
  ],

  // Ignore specific transactions
  ignoreTransactions: [
    // Health check endpoints
    '/api/health',
    '/api/metrics',
    '/api/ping',
    // Static assets
    '/_next/static',
    '/favicon.ico',
  ],

  // Sampling configuration
  sampleRate: process.env.NODE_ENV === 'production' ? 0.25 : 1.0,

  // Tracing options
  tracingOptions: {
    // Track database queries
    trackDbQueries: true,
  },

  // Transport options
  transportOptions: {
    // Keep connections alive
    keepAlive: true,
    // Maximum number of days to keep events
    maxCacheDays: 30,
  },
});