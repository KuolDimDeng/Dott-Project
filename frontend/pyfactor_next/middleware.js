import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Industry-standard CSP implementation with nonce support
 * Allows authentication while maintaining security
 */

export function middleware(request) {
  const response = NextResponse.next();
  
  // Generate a nonce for this request
  const nonce = crypto.randomBytes(16).toString('base64');
  
  // Add nonce to request headers for use in components
  response.headers.set('X-CSP-Nonce', nonce);
  
  // Check if this is an authentication-related path
  const isAuthPath = request.nextUrl.pathname.startsWith('/auth') || 
                     request.nextUrl.pathname.startsWith('/api/auth');
  
  // Build CSP policy
  const cspDirectives = [];
  
  // Default source
  cspDirectives.push("default-src 'self'");
  
  // Script sources - Industry standard approach
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`, // Allow scripts with this nonce
  ];
  
  // For authentication pages, add specific hash for the establish-session form
  // This hash is from your error message - the specific inline script needed for auth
  if (isAuthPath) {
    scriptSources.push("'sha256-mHVJrqf405kt9COJfFfRNPGPFhA9M8E0mexi7ETxbsc='");
  }
  
  // Add trusted external scripts
  scriptSources.push(
    'https://accounts.google.com',
    'https://auth.dottapps.com',
    'https://dev-cbyy63jovi6zrcos.us.auth0.com',
    'https://js.stripe.com',
    'https://checkout.stripe.com',
    'https://client.crisp.chat',
    'https://widget.crisp.chat',
    'https://cdn.plaid.com',
    'https://cdn.posthog.com',
    'https://app.posthog.com',
    'https://*.posthog.com',
    'https://maps.googleapis.com',
    'https://maps.gstatic.com',
    'https://static.cloudflareinsights.com',
    'https://*.cloudflareinsights.com'
  );
  
  cspDirectives.push(`script-src ${scriptSources.join(' ')}`);
  
  // Style sources - keeping unsafe-inline for CSS frameworks (industry standard compromise)
  cspDirectives.push(
    "style-src 'self' 'unsafe-inline' " +
    "https://fonts.googleapis.com " +
    "https://client.crisp.chat"
  );
  
  // Font sources
  cspDirectives.push(
    "font-src 'self' data: " +
    "https://fonts.gstatic.com " +
    "https://client.crisp.chat"
  );
  
  // Image sources
  cspDirectives.push(
    "img-src 'self' data: https: blob: " +
    "https://*.dottapps.com " +
    "https://maps.googleapis.com " +
    "https://maps.gstatic.com " +
    "https://lh3.googleusercontent.com " +
    "https://*.stripe.com"
  );
  
  // Connect sources (API calls)
  cspDirectives.push(
    "connect-src 'self' " +
    "https://*.auth0.com " +
    "https://*.stripe.com " +
    "https://*.googleapis.com " +
    "wss://*.crisp.chat " +
    "https://*.crisp.chat " +
    "https://api.stripe.com " +
    "https://api.dottapps.com " +
    "https://auth.dottapps.com " +
    "https://dottapps.com " +
    "https://www.dottapps.com " +
    "https://ipapi.co " +
    "https://api.country.is " +
    "https://ipinfo.io " +
    "https://ipgeolocation.io " +
    "https://*.plaid.com " +
    "https://app.posthog.com " +
    "https://*.posthog.com " +
    "https://*.cloudflare.com " +
    "https://*.ingest.sentry.io " +
    "https://*.ingest.us.sentry.io " +
    "ws://localhost:* " + // For development
    "wss://localhost:*"
  );
  
  // Frame sources
  cspDirectives.push(
    "frame-src 'self' " +
    "https://accounts.google.com " +
    "https://auth.dottapps.com " +
    "https://dev-cbyy63jovi6zrcos.us.auth0.com " +
    "https://js.stripe.com " +
    "https://checkout.stripe.com " +
    "https://client.crisp.chat " +
    "https://*.plaid.com"
  );
  
  // Worker sources (for PostHog session recording)
  cspDirectives.push(
    "worker-src 'self' blob: " +
    "https://app.posthog.com " +
    "https://*.posthog.com"
  );
  
  // Object sources - none for security
  cspDirectives.push("object-src 'none'");
  
  // Base URI - self only
  cspDirectives.push("base-uri 'self'");
  
  // Form actions
  cspDirectives.push(
    "form-action 'self' " +
    "https://auth.dottapps.com " +
    "https://dottapps.com " +
    "https://www.dottapps.com"
  );
  
  // Upgrade insecure requests in production
  if (process.env.NODE_ENV === 'production') {
    cspDirectives.push('upgrade-insecure-requests');
  }
  
  // Set the CSP header
  const cspHeader = cspDirectives.join('; ');
  response.headers.set('Content-Security-Policy', cspHeader);
  
  // Add other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  
  return response;
}

export const config = {
  // Apply middleware to all routes except static files and API routes that need different CSP
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};