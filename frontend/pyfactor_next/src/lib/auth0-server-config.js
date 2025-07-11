// Server-side Auth0 configuration
// This file should only be imported in server components and API routes

export function getAuth0Config() {
  // For client-side code, only return public config
  if (typeof window !== 'undefined') {
    return {
      domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
      clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com',
      issuerBaseURL: `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}`,
    };
  }

  // For server-side, we need to proxy through backend or use a different approach
  const config = {
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET || 'MISSING_SECRET_PROXY_TO_BACKEND',
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com',
    secret: process.env.AUTH0_SECRET || generateFallbackSecret(),
    issuerBaseURL: `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}`,
    authorizationParams: {
      scope: 'openid profile email offline_access',
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
    },
    session: {
      cookie: {
        secure: true,
        sameSite: 'lax',
        httpOnly: true,
      },
      duration: 24 * 60 * 60, // 24 hours
    },
    routes: {
      callback: '/api/auth/callback',
      postLogoutRedirect: '/',
      login: '/api/auth/login',
      logout: '/api/auth/logout',
    },
  };

  return config;
}

// Generate a fallback secret for development/testing
// In production, this should fail loudly
function generateFallbackSecret() {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: AUTH0_SECRET is missing in production!');
    // In production, we should use the backend for auth
    return 'MUST_USE_BACKEND_AUTH';
  }
  
  // For development only
  return 'dev_secret_' + Buffer.from(process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dottapps').toString('base64');
}

// Check if we're missing critical secrets
export function isUsingBackendAuth() {
  return !process.env.AUTH0_CLIENT_SECRET || !process.env.AUTH0_SECRET;
}