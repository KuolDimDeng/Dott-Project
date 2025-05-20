// src/lib/rateLimit.js

// Simple in-memory store for rate limiting
// Note: For production, use Redis or similar for distributed systems
const store = new Map();

// Constants
const WINDOW_SIZE = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // requests per window

// Clean up old entries
const cleanup = () => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now - value.timestamp > WINDOW_SIZE) {
      store.delete(key);
    }
  }
};

// Get client identifier from request
const getClientIdentifier = (req) => {
  // Use forwarded header if behind proxy, fallback to remote address
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             req.ip || 
             'unknown';
             
  return `${ip}-${req.nextUrl.pathname}`;
};

export async function rateLimit(req) {
  try {
    cleanup();

    const identifier = getClientIdentifier(req);
    const now = Date.now();

    // Get existing record
    const record = store.get(identifier) || {
      count: 0,
      timestamp: now,
      blocked: false
    };

    // Reset if window has passed
    if (now - record.timestamp > WINDOW_SIZE) {
      record.count = 0;
      record.timestamp = now;
      record.blocked = false;
    }

    // Check if blocked
    if (record.blocked) {
      const timeLeft = WINDOW_SIZE - (now - record.timestamp);
      return {
        success: false,
        retryAfter: timeLeft
      };
    }

    // Increment count
    record.count += 1;

    // Block if over limit
    if (record.count > MAX_REQUESTS) {
      record.blocked = true;
      store.set(identifier, record);
      return {
        success: false,
        retryAfter: WINDOW_SIZE
      };
    }

    // Update store
    store.set(identifier, record);

    return {
      success: true,
      remaining: MAX_REQUESTS - record.count
    };

  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow request through
    return { success: true };
  }
}

// For testing/monitoring
export const getRateLimitStore = () => store;

// Optional: Reset store
export const resetRateLimitStore = () => store.clear();