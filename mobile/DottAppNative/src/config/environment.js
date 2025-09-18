// Environment configuration for the mobile app
// Switch between production and staging environments

const ENV_CONFIG = {
  production: {
    apiUrl: 'https://api.dottapps.com/api',
    wsUrl: 'wss://api.dottapps.com',
    auth0Domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
    auth0ClientId: 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG',
    auth0Audience: 'https://api.dottapps.com',
    sessionEndpoint: '/api/sessions/create/',
    // Stripe Publishable Key for production (replace with actual production key)
    stripePublishableKey: 'pk_live_YOUR_PRODUCTION_KEY_HERE',
  },
  staging: {
    apiUrl: 'https://dott-api-staging.onrender.com/api',
    wsUrl: 'wss://dott-api-staging.onrender.com',
    auth0Domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
    auth0ClientId: 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG',
    auth0Audience: 'https://api-staging.dottapps.com',
    sessionEndpoint: '/api/sessions/create/',
    // Stripe Publishable Key for staging/test (from render-build.sh)
    stripePublishableKey: 'pk_test_51RI9epFls6i75mQBc3JI8lpcOUnaMlYAGmbDgOrIylbAqUaCOG035DlZFz35vneimME1QmdSiFiObsv3kcnCSNFi000AABL5EU',
  },
  local: {
    apiUrl: 'http://localhost:8000/api',
    wsUrl: 'ws://localhost:8000',
    auth0Domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
    auth0ClientId: 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG',
    auth0Audience: 'https://api.dottapps.com',
    sessionEndpoint: '/api/sessions/create/',
    // Stripe Publishable Key for local development
    stripePublishableKey: 'pk_test_51RI9epFls6i75mQBc3JI8lpcOUnaMlYAGmbDgOrIylbAqUaCOG035DlZFz35vneimME1QmdSiFiObsv3kcnCSNFi000AABL5EU',
  }
};

// Change this to switch environments
// Options: 'production', 'staging', 'local'
const CURRENT_ENV = 'staging';

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
  // For production and local, use the base URL without /api
  const baseUrl = ENV.apiUrl.replace('/api', '');
  // Ensure the URL is properly formatted
  return baseUrl || 'https://api.dottapps.com';
};

export default ENV;