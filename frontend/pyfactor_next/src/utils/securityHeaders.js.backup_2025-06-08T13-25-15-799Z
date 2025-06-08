// Add to existing middleware or create new one
export function addSecurityHeaders(response) {
  // Content Security Policy to prevent external script injection
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.auth0.com https://*.stripe.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googletagmanager.com https://*.google-analytics.com https://client.crisp.chat https://*.crisp.chat",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://client.crisp.chat",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://*.auth0.com https://*.stripe.com https://*.googleapis.com wss://*.crisp.chat https://*.crisp.chat https://api.stripe.com",
    "frame-src 'self' https://*.auth0.com https://*.stripe.com https://www.youtube.com https://youtube.com",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  
  return response;
}
