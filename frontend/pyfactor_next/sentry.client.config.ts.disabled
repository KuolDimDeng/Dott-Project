// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a user loads your application in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Set the sample rate for performance monitoring.
  // 0.1 means 10% of transactions will be captured.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set the sample rate for session replays.
  // 0.1 means 10% of sessions will be recorded.
  replaysSessionSampleRate: 0.1,

  // Set the sample rate for error replays.
  // 1.0 means 100% of errors will be recorded.
  replaysOnErrorSampleRate: 1.0,

  // Configure the Replay integration
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Set the environment
  environment: process.env.NODE_ENV || "development",

  // Filter out specific errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    // Random network errors
    "Non-Error promise rejection captured",
    // Ignore errors from browser extensions
    /extension\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
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
    if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
      return null;
    }

    // Add user context if available
    if (typeof window !== "undefined") {
      const userData = window.localStorage.getItem("user");
      if (userData) {
        try {
          const user = JSON.parse(userData);
          Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.name,
          });
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }

    return event;
  },

  // Enable experimental features
  _experiments: {
    metricsAggregator: true,
  },
});