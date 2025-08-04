// Enhanced security headers for financial data protection
export function addSecurityHeaders(response, nonce = null) {
  // Generate nonce if not provided
  if (!nonce) {
    // Use Web Crypto API for Edge Runtime compatibility
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      nonce = btoa(String.fromCharCode.apply(null, array));
    } else {
      // Fallback for older environments
      nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
  }
  
  // Store nonce in response for use in components
  response.headers.set('X-Nonce', nonce);
  
  // Content Security Policy - Strict mode for financial data with Cloudflare compatibility
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.auth0.com https://*.stripe.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googletagmanager.com https://*.google-analytics.com https://client.crisp.chat https://*.crisp.chat https://app.posthog.com https://*.posthog.com https://cdn.plaid.com https://static.cloudflareinsights.com https://*.sentry.io",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://client.crisp.chat",
    "font-src 'self' https://fonts.gstatic.com https://client.crisp.chat data:",
    "img-src 'self' data: blob: https: https://*.dottapps.com",
    "connect-src 'self' https://*.auth0.com https://*.stripe.com https://*.googleapis.com wss://*.crisp.chat https://*.crisp.chat https://api.stripe.com https://api.dottapps.com https://auth.dottapps.com https://dottapps.com https://www.dottapps.com https://ipapi.co https://api.country.is https://ipinfo.io https://ipgeolocation.io https://app.posthog.com https://*.posthog.com https://*.plaid.com https://*.cloudflare.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.sentry.io",
    "worker-src 'self' blob: https://app.posthog.com https://*.posthog.com",
    "frame-src 'self' https://*.auth0.com https://*.stripe.com https://client.crisp.chat https://*.plaid.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.auth0.com https://*.stripe.com https://auth.dottapps.com https://dottapps.com https://www.dottapps.com",
    "upgrade-insecure-requests"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  
  // Additional security headers for financial data protection
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()');
  
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Additional financial data protection headers
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Expect-CT', 'max-age=86400, enforce');
  response.headers.set('Feature-Policy', "geolocation 'none'; microphone 'none'; camera 'none'");
  
  // Cloudflare-specific headers
  const pathname = response.headers.get('x-pathname');
  if (pathname) {
    // Add cache control based on path
    if (pathname.startsWith('/_next/static/') || pathname.match(/\.(js|css|jpg|jpeg|png|gif|ico|woff|woff2|svg)$/)) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      response.headers.set('CDN-Cache-Control', 'max-age=31536000');
    } else if (pathname.startsWith('/api/')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('CDN-Cache-Control', 'no-store');
    } else {
      // HTML pages - short cache with revalidation
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      response.headers.set('CDN-Cache-Control', 'max-age=300'); // 5 minutes at CDN
    }
  }
  
  return response;
}
