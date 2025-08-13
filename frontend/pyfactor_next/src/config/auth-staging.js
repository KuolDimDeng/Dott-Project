// Staging-specific Auth0 configuration
export const stagingAuth0Config = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com',
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF',
  audience: process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' 
    ? 'https://api-staging.dottapps.com'
    : process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
  redirectUri: process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging'
    ? 'https://staging.dottapps.com/api/auth/callback'
    : typeof window !== 'undefined' ? window.location.origin + '/api/auth/callback' : '',
  scope: 'openid profile email'
};
