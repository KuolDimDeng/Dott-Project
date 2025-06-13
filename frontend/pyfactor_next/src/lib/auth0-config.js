// Auth0 configuration
// This file provides the configuration for Auth0 SDK

export const auth0Config = {
  baseURL: process.env.AUTH0_BASE_URL || 'https://dottapps.com',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || 'https://auth.dottapps.com',
  clientID: process.env.AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF',
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET || process.env.AUTH0_CLIENT_SECRET,
  authorizationParams: {
    scope: 'openid profile email offline_access',
    audience: process.env.AUTH0_AUDIENCE || 'https://api.dottapps.com',
  },
  session: {
    rollingDuration: 60 * 60 * 24, // 24 hours
    absoluteDuration: 60 * 60 * 24 * 7, // 7 days
  },
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: '/',
  },
};