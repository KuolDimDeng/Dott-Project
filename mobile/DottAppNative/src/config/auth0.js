// Auth0 Configuration
// This uses the industry-standard Authorization Code flow with PKCE
// which is recommended for mobile applications

export const AUTH0_CONFIG = {
  // Your Auth0 Domain
  domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
  
  // Native App Client ID for mobile (backend now accepts both web and mobile clients)
  clientId: 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG',
  
  // Redirect and logout URLs for mobile
  redirectUri: 'com.dottappnative://dev-cbyy63jovi6zrcos.us.auth0.com/ios/com.dottappnative/callback',
  logoutRedirectUri: 'com.dottappnative://dev-cbyy63jovi6zrcos.us.auth0.com/ios/com.dottappnative/logout',
  
  // API Audience for your backend
  audience: 'https://api.dottapps.com',
  
  // Scopes to request
  scope: 'openid profile email offline_access',
  
  // Additional parameters
  customScheme: 'com.dottappnative',
};

// Backend API configuration
export const API_CONFIG = {
  baseURL: 'https://api.dottapps.com',
  sessionEndpoint: '/api/sessions/create/',
};