// Server-side PostHog utilities for API routes
// This is a placeholder for server-side PostHog tracking

export async function captureEvent(eventName, properties = {}) {
  // In production, this would send events to PostHog from the server
  // For now, just log to console
  console.log(`[PostHog Server] Event: ${eventName}`, properties);
  
  // Return a promise to match the expected API
  return Promise.resolve();
}

export async function captureException(error, context = {}) {
  console.error(`[PostHog Server] Exception:`, error, context);
  return Promise.resolve();
}

export default {
  captureEvent,
  captureException
};