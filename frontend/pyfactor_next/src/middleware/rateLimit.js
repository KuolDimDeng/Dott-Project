import { LRUCache } from 'lru-cache';

// Create different rate limiters for different endpoints
const rateLimiters = {
  // Strict limit for authentication endpoints
  auth: new LRUCache({
    max: 1000, // Store up to 1000 IP addresses
    ttl: 60 * 60 * 1000, // 1 hour
  }),
  
  // Moderate limit for payment endpoints
  payment: new LRUCache({
    max: 1000,
    ttl: 60 * 60 * 1000, // 1 hour
  }),
  
  // General API limit
  api: new LRUCache({
    max: 5000,
    ttl: 15 * 60 * 1000, // 15 minutes
  })
};

// Rate limit configurations
const limits = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts. Please try again later.'
  },
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 payment attempts per hour
    message: 'Too many payment attempts. Please try again later.'
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests. Please slow down.'
  }
};

/**
 * Get client IP address from request
 */
function getClientIp(request) {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }
  
  // Fallback to remote address (not reliable behind proxies)
  return '127.0.0.1';
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(request, type = 'api') {
  const ip = getClientIp(request);
  const limiter = rateLimiters[type];
  const limit = limits[type];
  
  if (!limiter || !limit) {
    console.error(`Unknown rate limit type: ${type}`);
    return { limited: false };
  }
  
  // Get current request count for this IP
  const key = `${type}:${ip}`;
  const current = limiter.get(key) || 0;
  
  // Check if limit exceeded
  if (current >= limit.max) {
    return {
      limited: true,
      message: limit.message,
      retryAfter: Math.ceil(limit.windowMs / 1000), // in seconds
    };
  }
  
  // Increment counter
  limiter.set(key, current + 1);
  
  return {
    limited: false,
    remaining: limit.max - current - 1,
    reset: new Date(Date.now() + limit.windowMs).toISOString()
  };
}

/**
 * Create rate limit response
 */
export function rateLimitResponse(result) {
  return new Response(
    JSON.stringify({
      error: result.message || 'Too many requests',
      retryAfter: result.retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': limits[result.type]?.max || '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + (result.retryAfter * 1000)).toISOString(),
        'Retry-After': result.retryAfter?.toString() || '60'
      }
    }
  );
}