// This file configures the initialization of Sentry for edge routes.
// The config you add here will be used whenever an edge route handles a request.
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
    if (transaction.name === "GET /api/health") {
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

    // Add edge runtime context
    event.contexts = {
      ...event.contexts,
      runtime: {
        name: "edge",
      },
    };

    return event;
  },

  // Enable experimental features
  _experiments: {
    metricsAggregator: true,
  },
});