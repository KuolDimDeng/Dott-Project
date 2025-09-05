// Environment configuration for the mobile app
// Switch between production and staging environments

const ENV_CONFIG = {
  production: {
    apiUrl: 'https://api.dottapps.com/api',
    auth0Domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
    auth0ClientId: 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG',
    auth0Audience: 'https://api.dottapps.com',
    sessionEndpoint: '/api/sessions/create/',
  },
  staging: {
    apiUrl: 'https://dott-api-staging.onrender.com/api',
    auth0Domain: 'dev-cbyy63jovi6zrcos.us.auth0.com', 
    auth0ClientId: 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG',
    auth0Audience: 'https://api-staging.dottapps.com',
    sessionEndpoint: '/api/sessions/create/',
  },
  local: {
    apiUrl: 'http://localhost:8000/api',
    auth0Domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
    auth0ClientId: 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG', 
    auth0Audience: 'https://api.dottapps.com',
    sessionEndpoint: '/api/sessions/create/',
  }
};

// Change this to switch environments
// Options: 'production', 'staging', 'local'
const CURRENT_ENV = 'production';

export const ENV = ENV_CONFIG[CURRENT_ENV];
export const IS_PRODUCTION = CURRENT_ENV === 'production';
export const IS_STAGING = CURRENT_ENV === 'staging';
export const IS_LOCAL = CURRENT_ENV === 'local';

// Helper to get the base URL for session creation
export const getSessionBaseUrl = () => {
  // For staging, we need the direct render URL for session creation
  if (IS_STAGING) {
    return 'https://dott-api-staging.onrender.com';
  }
  return ENV.apiUrl.replace('/api', '');
};

export default ENV;