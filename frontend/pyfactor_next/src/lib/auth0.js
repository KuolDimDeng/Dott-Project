import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getAuth0Config, isUsingBackendAuth } from './auth0-server-config';

// Check if we need to use backend auth
if (isUsingBackendAuth() && typeof window === 'undefined') {
  console.warn('[Auth0] Missing secrets - authentication should be proxied through backend');
}

// Get configuration
const config = getAuth0Config();

// Create the Auth0 client instance
export const auth0 = new Auth0Client({
  ...config,
  // Ensure we always get an access token for API calls
  getAccessTokenSilently: {
    authorizationParams: {
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
      scope: 'openid profile email offline_access'
    }
  }
});