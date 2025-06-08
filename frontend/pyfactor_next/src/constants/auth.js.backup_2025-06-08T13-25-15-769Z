
///Users/kuoldeng/projectx/frontend/pyfactor_next/src/constants/auth.js
import { APP_CONFIG } from '@/config';

export const OAUTH_PATHS = {
  CALLBACK: '/api/auth/callback',
  GOOGLE: '/callback/google', 
  BASE: '/oauth'
};

export const AUTH_CONFIG = {
  TOKEN_GRACE_PERIOD: 60 * 1000,
  MAX_RETRIES: 3,
  OAUTH_PATHS
};

export const CONSTANTS = {
  TIMEOUT: 5000,
  AUTH: AUTH_CONFIG,
  SETUP_STATUS: {
    STARTED: 'STARTED',
    IN_PROGRESS: 'IN_PROGRESS', 
    SUCCESS: 'SUCCESS'
  },
  POLL_INTERVALS: {
    SETUP_SUCCESS: 10000,
    SETUP_IN_PROGRESS: 3000
  },
  ROUTES: {
    public: APP_CONFIG.routes.public,
    auth: APP_CONFIG.routes.auth.paths,
    static: APP_CONFIG.routes.static,
    onboarding: APP_CONFIG.routes.onboarding.paths
  }
};