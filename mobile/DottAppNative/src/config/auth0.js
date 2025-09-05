// Auth0 Configuration
// This uses the industry-standard Authorization Code flow with PKCE
// which is recommended for mobile applications

import ENV, { getSessionBaseUrl } from './environment';

export const AUTH0_CONFIG = {
  // Your Auth0 Domain
  domain: ENV.auth0Domain,
  
  // Native App Client ID for mobile (backend now accepts both web and mobile clients)
  clientId: ENV.auth0ClientId,
  
  // Redirect and logout URLs for mobile
  redirectUri: `com.dottappnative://${ENV.auth0Domain}/ios/com.dottappnative/callback`,
  logoutRedirectUri: `com.dottappnative://${ENV.auth0Domain}/ios/com.dottappnative/logout`,
  
  // API Audience for your backend
  audience: ENV.auth0Audience,
  
  // Scopes to request
  scope: 'openid profile email offline_access',
  
  // Additional parameters
  customScheme: 'com.dottappnative',
};

// Backend API configuration
export const API_CONFIG = {
  baseURL: getSessionBaseUrl(),
  sessionEndpoint: ENV.sessionEndpoint,
};