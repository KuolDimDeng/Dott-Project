// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Set the sample rate for performance monitoring.
  // 0.1 means 10% of transactions will be captured.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set the environment
  environment: process.env.NODE_ENV || "development",

  // Integrations
  integrations: [
    // Automatically instrument Node.js libraries and frameworks
    ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
  ],

  // Filter out specific errors
  ignoreErrors: [
    // Ignore non-critical errors
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "ECONNRESET",
  ],

  // Filter transactions
  beforeTransaction(transaction) {
    // Don't send transactions for health checks
    if (transaction.name === "GET /api/health" || transaction.name === "GET /api/backend-health") {
      return null;
    }
    return transaction;
  },

  // Add additional context
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DEBUG) {
      return null;
    }

    // Add server context
    event.contexts = {
      ...event.contexts,
      runtime: {
        name: "node",
        version: process.version,
      },
      app: {
        app_start_time: new Date().toISOString(),
        app_memory: process.memoryUsage().heapUsed,
      },
    };

    return event;
  },

  // Enable experimental features
  _experiments: {
    metricsAggregator: true,
  },

  // Profiling (requires additional setup)
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});