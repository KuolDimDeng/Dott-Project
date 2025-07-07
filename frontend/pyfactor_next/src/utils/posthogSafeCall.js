// Safe wrapper for PostHog method calls to prevent runtime errors

export function safePostHogCall(posthogInstance, methodName, ...args) {
  if (!posthogInstance) {
    console.warn(`[PostHog] Cannot call ${methodName} - PostHog instance is null`);
    return null;
  }

  if (typeof posthogInstance[methodName] !== 'function') {
    console.warn(`[PostHog] Method ${methodName} is not available on PostHog instance`);
    
    // Try alternative methods for common operations
    if (methodName === 'flush') {
      // Try alternative methods to send events
      if (typeof posthogInstance._send_request === 'function') {
        console.log('[PostHog] Using _send_request() as alternative to flush()');
        try {
          return posthogInstance._send_request(...args);
        } catch (error) {
          console.error('[PostHog] _send_request() failed:', error);
        }
      } else if (typeof posthogInstance._flush === 'function') {
        console.log('[PostHog] Using _flush() as alternative to flush()');
        try {
          return posthogInstance._flush(...args);
        } catch (error) {
          console.error('[PostHog] _flush() failed:', error);
        }
      }
    }
    
    return null;
  }

  try {
    return posthogInstance[methodName](...args);
  } catch (error) {
    console.error(`[PostHog] Error calling ${methodName}:`, error);
    return null;
  }
}

// Helper to check if PostHog is properly initialized
export function isPostHogReady(posthogInstance) {
  if (!posthogInstance) return false;
  
  // Check for essential methods
  const essentialMethods = ['capture', 'identify', 'get_distinct_id'];
  return essentialMethods.every(method => typeof posthogInstance[method] === 'function');
}

// Safe flush implementation
export function safeFlush(posthogInstance) {
  return safePostHogCall(posthogInstance, 'flush');
}