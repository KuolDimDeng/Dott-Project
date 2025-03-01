import { logger } from '@/utils/logger';

// Required environment variables
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_AWS_REGION',
  'NEXT_PUBLIC_COGNITO_USER_POOL_ID',
  'NEXT_PUBLIC_COGNITO_CLIENT_ID'
];

// Optional environment variables with default values
const DEFAULT_ENV_VARS = {
  'NEXT_PUBLIC_ENV': 'development',
  'NEXT_PUBLIC_LOG_LEVEL': 'debug',
  'NEXT_PUBLIC_AUTH_FLOW_TYPE': 'USER_SRP_AUTH',
  'NEXT_PUBLIC_ALLOWED_AUTH_FLOWS': 'USER_SRP_AUTH,USER_PASSWORD_AUTH,REFRESH_TOKEN_AUTH',
  'NEXT_PUBLIC_LOG_TO_CONSOLE': 'true',
  'NEXT_PUBLIC_TOKEN_REFRESH_BUFFER': '300000',
  'NEXT_PUBLIC_TOKEN_REFRESH_RETRY_DELAY': '1000',
  'NEXT_PUBLIC_TOKEN_REFRESH_MAX_RETRIES': '3'
};

// Debug function to log all environment variables
function logEnvironmentVariables() {
  const publicEnvVars = {};
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('NEXT_PUBLIC_')) {
      publicEnvVars[key] = key.includes('COGNITO') || key.includes('AWS') 
        ? '[REDACTED]' 
        : process.env[key];
    }
  }
  logger.debug('[EnvConfig] Public environment variables:', publicEnvVars);
}

// Validate environment variables
export function validateEnvConfig() {
  logger.debug('[EnvConfig] Starting environment validation');
  
  // Log all environment variables first
  logEnvironmentVariables();
  
  const missingVars = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
      logger.warn(`[EnvConfig] Missing required variable: ${varName}`);
    }
  });

  // Set default values for optional variables
  Object.entries(DEFAULT_ENV_VARS).forEach(([varName, defaultValue]) => {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
      logger.debug(`[EnvConfig] Setting default value for ${varName}`);
    }
  });

  // Log validation results
  if (missingVars.length > 0) {
    const error = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error('[EnvConfig] Validation failed:', { error, missingVars });
    throw new Error(error);
  }

  logger.debug('[EnvConfig] Validation successful');
  return true;
}

// Get Amplify v6 configuration
export function getAmplifyConfig() {
  try {
    logger.debug('[EnvConfig] Getting Amplify configuration');

    // Ensure environment variables are loaded
    if (typeof window !== 'undefined') {
      // Client-side
      validateEnvConfig();
    }

    const config = {
      Auth: {
        Cognito: {
          userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
          userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
          region: process.env.NEXT_PUBLIC_AWS_REGION,
          // Auth flows configuration
          authenticationFlowType: process.env.NEXT_PUBLIC_AUTH_FLOW_TYPE || 'USER_SRP_AUTH',
          // Enable all auth flows
          allowedAuthFlows: (process.env.NEXT_PUBLIC_ALLOWED_AUTH_FLOWS || '')
            .split(',')
            .map(flow => flow.trim())
            .filter(Boolean),
          // Login configuration
          loginWith: {
            email: true,
            phone: false,
            username: false,
            oauth: false
          },
          // Required scopes for Cognito
          scope: [
            'aws.cognito.signin.user.admin',
            'email',
            'openid',
            'profile'
          ]
        }
      }
    };

    logger.debug('[EnvConfig] Amplify configuration prepared:', {
      userPoolId: '[REDACTED]',
      region: config.Auth.Cognito.region,
      authFlowType: config.Auth.Cognito.authenticationFlowType,
      authFlows: config.Auth.Cognito.allowedAuthFlows,
      loginWith: config.Auth.Cognito.loginWith,
      scopes: config.Auth.Cognito.scope
    });

    return config;
  } catch (error) {
    logger.error('[EnvConfig] Failed to get Amplify config:', {
      error: error.message,
      code: error.code,
      name: error.name
    });
    throw error;
  }
}

// Environment helpers
export const envConfig = {
  isDevelopment: process.env.NEXT_PUBLIC_ENV === 'development',
  isProduction: process.env.NEXT_PUBLIC_ENV === 'production',
  logLevel: process.env.NEXT_PUBLIC_LOG_LEVEL || 'debug',
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  wsUrl: process.env.NEXT_PUBLIC_WS_URL,
  awsRegion: process.env.NEXT_PUBLIC_AWS_REGION,
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  cognitoDomain: process.env.NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN,
  redirectSignIn: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGNIN,
  redirectSignOut: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGNOUT
};