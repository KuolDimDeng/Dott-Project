import { fetchAuthSession, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { getRefreshedAccessToken, isTokenExpired } from '@/utils/auth';
import { jwtDecode } from 'jwt-decode';

export async function validateSession(providedTokens) {
  try {
    let tokens = providedTokens;

    // Server-side handling
    if (typeof window === 'undefined') {
      if (!tokens?.accessToken || !tokens?.idToken) {
        throw new Error('No valid session tokens provided for server-side operation');
      }
      
      // Check if token is expired
      if (isTokenExpired(tokens.accessToken)) {
        throw new Error('Token expired for server-side operation');
      }
      
      return { tokens };
    }

    // Client-side handling
    if (!tokens) {
      const cookieTokens = parseCookies();
      if (cookieTokens.accessToken && cookieTokens.idToken) {
        tokens = {
          accessToken: cookieTokens.accessToken,
          idToken: cookieTokens.idToken
        };
        logger.debug('[OnboardingUtils] Using tokens from client cookies');
      }
    }

    // Check if tokens are expired or missing
    let needsRefresh = !tokens?.accessToken || !tokens?.idToken;
    
    if (tokens?.accessToken && !needsRefresh) {
      try {
        // Check if token is expired or about to expire (within 5 minutes)
        const decoded = jwtDecode(tokens.accessToken);
        const now = Math.floor(Date.now() / 1000);
        const fiveMinutesInSeconds = 5 * 60;
        
        if (decoded.exp && decoded.exp - now < fiveMinutesInSeconds) {
          logger.info('[OnboardingUtils] Token is expired or about to expire, refreshing');
          needsRefresh = true;
        }
      } catch (tokenError) {
        logger.warn('[OnboardingUtils] Error checking token expiration:', tokenError);
        needsRefresh = true;
      }
    }

    // If tokens need refresh, get fresh tokens
    if (needsRefresh) {
      logger.debug('[OnboardingUtils] Tokens need refresh, getting new tokens');
      
      // Try to use our specialized refresh function first
      try {
        const refreshedToken = await getRefreshedAccessToken();
        if (refreshedToken) {
          logger.info('[OnboardingUtils] Successfully refreshed token');
          
          // Get a fresh session to get both tokens
          const session = await fetchAuthSession();
          tokens = {
            accessToken: session.tokens.accessToken.toString(),
            idToken: session.tokens.idToken.toString()
          };
          
          // Update cookies
          document.cookie = `idToken=${tokens.idToken}; path=/`;
          document.cookie = `accessToken=${tokens.accessToken}; path=/`;
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        logger.warn('[OnboardingUtils] Token refresh failed, falling back to fetchAuthSession:', refreshError);
        
        // Fallback to regular session fetch
        const session = await fetchAuthSession();
        tokens = {
          accessToken: session.tokens.accessToken.toString(),
          idToken: session.tokens.idToken.toString()
        };
        
        // Update cookies
        document.cookie = `idToken=${tokens.idToken}; path=/`;
        document.cookie = `accessToken=${tokens.accessToken}; path=/`;
      }
    }

    logger.debug('[OnboardingUtils] Session tokens:', {
      hasIdToken: !!tokens.idToken,
      hasAccessToken: !!tokens.accessToken,
      idTokenLength: tokens.idToken?.length,
      accessTokenLength: tokens.accessToken?.length
    });

    // Only get current user on client side
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No current user found');
    }

    return { tokens, user };
  } catch (error) {
    logger.error('[OnboardingUtils] Session validation failed:', error);
    throw error;
  }
}

function parseCookies() {
  const cookies = {};
  if (typeof window !== 'undefined') {
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

export async function updateOnboardingStep(step, additionalAttributes = {}, tokens = null) {
  try {
    // Validate session with provided tokens
    const { tokens: validTokens } = await validateSession(tokens);

    // Format attributes
    const formattedAttributes = {
      'custom:onboarding': String(step),
      'custom:updated_at': new Date().toISOString(),
      ...Object.entries(additionalAttributes).reduce((acc, [key, value]) => ({
        ...acc,
        [key.startsWith('custom:') ? key : `custom:${key}`]: String(value)
      }), {})
    };

    logger.debug('[OnboardingUtils] Updating step:', {
      step,
      attributes: Object.keys(formattedAttributes)
    });

    // Server-side update using AWS SDK
    if (typeof window === 'undefined') {
      try {
        // Import AWS SDK - must use require for server-side
        const AWS = require('aws-sdk');
        
        // Configure the Cognito Identity Provider
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
          region: 'us-east-1'
        });
        
        // Format attributes for AWS SDK
        const userAttributes = Object.entries(formattedAttributes).map(([key, value]) => ({
          Name: key,
          Value: value
        }));
        
        // Make the update request using the SDK
        const updateParams = {
          AccessToken: validTokens.accessToken,
          UserAttributes: userAttributes
        };
        
        await cognitoIdentityServiceProvider.updateUserAttributes(updateParams).promise();
        logger.debug('[OnboardingUtils] Server-side attributes updated successfully');
      } catch (error) {
        logger.error('[OnboardingUtils] Server-side attribute update failed:', {
          error: error.message,
          code: error.code,
          statusCode: error.statusCode
        });
        throw new Error(`Failed to update attributes: ${error.message}`);
      }
    } else {
      // Client-side update using Amplify
      await updateUserAttributes({
        userAttributes: formattedAttributes
      });
    }

    logger.debug('[OnboardingUtils] Step updated successfully');
    return true;
  } catch (error) {
    logger.error('[OnboardingUtils] Failed to update step:', {
      error: error.message,
      code: error.code,
      step
    });
    throw error;
  }
}

export async function completeOnboarding() {
  try {
    // Validate session first
    await validateSession();

    // Update user attributes using v6 API with string values
    await updateUserAttributes({
      userAttributes: {
        'custom:onboarding': 'COMPLETE',
        'custom:setupdone': 'TRUE',
        'custom:updated_at': new Date().toISOString()
      }
    });

    logger.debug('[OnboardingUtils] Onboarding completed successfully');
    return true;
  } catch (error) {
    logger.error('[OnboardingUtils] Failed to complete onboarding:', {
      error: error.message,
      code: error.code
    });
    throw error;
  }
}

export async function getOnboardingStatus() {
  try {
    // Validate session first
    const { user } = await validateSession();

    const attributes = user.attributes || {};
    const currentStep = attributes['custom:onboarding'] || 'NOT_STARTED';
    const setupDone = attributes['custom:setupdone'] === 'TRUE';

    return {
      currentStep,
      setupDone,
      attributes
    };
  } catch (error) {
    logger.error('[OnboardingUtils] Failed to get status:', {
      error: error.message,
      code: error.code
    });
    throw error;
  }
}

export async function validateBusinessInfo(data) {
  const requiredFields = [
    'businessName',
    'businessType',
    'country',
    'legalStructure',
    'dateFounded'
  ];

  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Additional validation rules
  if (data.businessName.length < 2 || data.businessName.length > 100) {
    throw new Error('Business name must be between 2 and 100 characters');
  }

  if (data.country.length !== 2) {
    throw new Error('Invalid country code');
  }

  // Validate date founded
  const dateFounded = new Date(data.dateFounded);
  if (isNaN(dateFounded.getTime())) {
    throw new Error('Invalid date founded');
  }

  if (dateFounded > new Date()) {
    throw new Error('Date founded cannot be in the future');
  }

  // Format business info for Cognito attributes
  const formattedAttributes = {
    'custom:businessname': String(data.businessName),
    'custom:businesstype': String(data.businessType),
    'custom:businesssubtypes': String(data.businessSubtypes || ''),
    'custom:businesscountry': String(data.country),
    'custom:businessstate': String(data.businessState || ''),
    'custom:legalstructure': String(data.legalStructure),
    'custom:datefounded': data.dateFounded.split('T')[0] // Format as YYYY-MM-DD
  };

  return formattedAttributes;
}

export async function validateSubscription(data) {
  const validPlans = ['FREE', 'PROFESSIONAL', 'ENTERPRISE'];
  const validIntervals = ['MONTHLY', 'YEARLY'];

  logger.debug('[Subscription] Values before validation:', {
    rawPlan: data.plan,
    rawInterval: data.interval,
    convertedPlan: data.plan?.toUpperCase(),
    convertedInterval: data.interval?.toUpperCase(),
    validPlans: ['FREE', 'PROFESSIONAL', 'ENTERPRISE'],
    validIntervals: ['MONTHLY', 'YEARLY']
  });

  // Case-insensitive validation
  const plan = data.plan?.toUpperCase();
  const interval = data.interval?.toUpperCase();

  if (!validPlans.includes(plan)) {
    throw new Error(`Invalid subscription plan. Must be one of: ${validPlans.join(', ')}`);
  }

  if (!validIntervals.includes(interval)) {
    throw new Error(`Invalid subscription interval. Must be one of: ${validIntervals.join(', ')}`);
  }

  // Format subscription info for Cognito attributes
  const formattedAttributes = {
    'custom:subplan': String(data.plan),
    'custom:subscriptioninterval': String(data.interval)
  };

  return formattedAttributes;
}

export async function validatePayment(data) {
  if (!data.paymentId) {
    throw new Error('Payment ID is required');
  }

  if (typeof data.verified !== 'boolean') {
    throw new Error('Payment verification status is required');
  }

  // Format payment info for Cognito attributes
  const formattedAttributes = {
    'custom:paymentid': String(data.paymentId),
    'custom:payverified': data.verified ? 'TRUE' : 'FALSE'
  };

  return formattedAttributes;
}