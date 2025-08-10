/**
 * Content Security Policy configuration
 * Using nonce-based approach for inline scripts instead of unsafe-inline
 */

const crypto = require('crypto');

function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

function getCSPHeader(nonce) {
  const directives = {
    'default-src': ["'self'"],
    
    // Scripts - use nonce instead of unsafe-inline/unsafe-eval
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      'https://accounts.google.com',
      'https://auth.dottapps.com',
      'https://dev-cbyy63jovi6zrcos.us.auth0.com',
      'https://js.stripe.com',
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
    ],
    
    // Worker sources for PostHog
    'worker-src': ["'self'", 'blob:', 'https://app.posthog.com', 'https://*.posthog.com'],
    
    // Styles - gradually migrate to nonce-based
    'style-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'unsafe-inline'", // Temporary - remove after migrating styles
      'https://fonts.googleapis.com',
      'https://client.crisp.chat'
    ],
    
    // Fonts
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://client.crisp.chat'],
    
    // Images
    'img-src': [
      "'self'",
      'data:',
      'https:',
      'blob:',
      'https://*.dottapps.com',
      'https://maps.googleapis.com',
      'https://maps.gstatic.com'
    ],
    
    // Connections
    'connect-src': [
      "'self'",
      'https://*.auth0.com',
      'https://*.stripe.com',
      'https://*.googleapis.com',
      'wss://*.crisp.chat',
      'https://*.crisp.chat',
      'https://api.stripe.com',
      'https://api.dottapps.com',
      'https://auth.dottapps.com',
      'https://dottapps.com',
      'https://www.dottapps.com',
      'https://ipapi.co',
      'https://api.country.is',
      'https://ipinfo.io',
      'https://ipgeolocation.io',
      'https://*.plaid.com',
      'https://app.posthog.com',
      'https://*.posthog.com',
      'https://*.cloudflare.com',
      'https://*.ingest.sentry.io',
      'https://*.ingest.us.sentry.io'
    ],
    
    // Frames
    'frame-src': [
      "'self'",
      'https://accounts.google.com',
      'https://auth.dottapps.com',
      'https://dev-cbyy63jovi6zrcos.us.auth0.com',
      'https://js.stripe.com',
      'https://client.crisp.chat',
      'https://*.plaid.com'
    ],
    
    // Objects
    'object-src': ["'none'"],
    
    // Base URI
    'base-uri': ["'self'"],
    
    // Form actions
    'form-action': [
      "'self'",
      'https://auth.dottapps.com',
      'https://dottapps.com',
      'https://www.dottapps.com'
    ],
    
    // Upgrade insecure requests
    'upgrade-insecure-requests': []
  };

  // Convert to CSP string
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

// Development CSP (more permissive)
function getDevCSP(nonce) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'unsafe-eval'", // Required for React Fast Refresh in dev
      'https://*.auth0.com',
      'https://*.stripe.com',
      'https://*.googleapis.com',
      'https://*.crisp.chat',
      'https://*.plaid.com',
      'https://*.posthog.com',
      'https://*.cloudflareinsights.com'
    ],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'connect-src': ["'self'", 'https:', 'wss:', 'ws://localhost:*'],
    'frame-src': ["'self'", 'https:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"]
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

module.exports = {
  generateNonce,
  getCSPHeader,
  getDevCSP
};