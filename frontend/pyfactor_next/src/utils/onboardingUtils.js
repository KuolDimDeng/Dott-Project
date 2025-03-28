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
    // Track performance and attempt status
    const startTime = performance.now();
    let attributeUpdateSuccess = false;
    const requestId = crypto.randomUUID();
    
    logger.debug('[OnboardingUtils] Starting onboarding completion', {
      requestId,
      timestamp: new Date().toISOString()
    });
    
    // Define attributes to update
    const userAttributes = {
      'custom:onboarding': 'COMPLETE',
      'custom:setupdone': 'TRUE',
      'custom:updated_at': new Date().toISOString(),
      'custom:onboardingCompletedAt': new Date().toISOString()
    };
    
    try {
      // First attempt: Use Amplify updateUserAttributes
      await updateUserAttributes({ userAttributes });
      attributeUpdateSuccess = true;
      
      logger.debug('[OnboardingUtils] Attributes updated via Amplify', {
        requestId,
        method: 'direct_amplify',
        elapsedMs: performance.now() - startTime
      });
    } catch (updateError) {
      logger.error('[OnboardingUtils] Amplify update failed', {
        requestId,
        error: updateError.message,
        code: updateError.code,
        elapsedMs: performance.now() - startTime
      });
      
      // If Amplify update fails, try the direct API call as a backup
      try {
        // Get current session for authentication
        const { tokens } = await fetchAuthSession();
        
        // Make direct API call to update attributes
        const response = await fetch('/api/user/update-attributes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.accessToken}`,
            'X-Request-ID': requestId
          },
          body: JSON.stringify({
            attributes: userAttributes,
            forceUpdate: true
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          attributeUpdateSuccess = true;
          
          logger.debug('[OnboardingUtils] Attributes updated via API call', {
            requestId,
            method: 'api_call',
            result,
            elapsedMs: performance.now() - startTime
          });
        } else {
          throw new Error(`API returned status ${response.status}`);
        }
      } catch (apiError) {
        logger.error('[OnboardingUtils] API update failed', {
          requestId,
          error: apiError.message,
          elapsedMs: performance.now() - startTime
        });
        
        // Final attempt: Try using the onboarding complete endpoint
        try {
          const completeResponse = await fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId
            }
          });
          
          if (completeResponse.ok) {
            attributeUpdateSuccess = true;
            
            logger.debug('[OnboardingUtils] Completion via dedicated endpoint succeeded', {
              requestId,
              method: 'complete_endpoint',
              elapsedMs: performance.now() - startTime
            });
          } else {
            throw new Error(`Complete endpoint returned status ${completeResponse.status}`);
          }
        } catch (completeError) {
          logger.error('[OnboardingUtils] All update methods failed', {
            requestId,
            completeError: completeError.message,
            elapsedMs: performance.now() - startTime
          });
          throw new Error('Failed to complete onboarding after multiple attempts');
        }
      }
    }
    
    // Set cookies for immediate client-side status update
    if (attributeUpdateSuccess) {
      document.cookie = `onboardingStep=COMPLETE; path=/; max-age=${60*60*24*7}`;
      document.cookie = `onboardedStatus=COMPLETE; path=/; max-age=${60*60*24*7}`;
      document.cookie = `setupCompleted=true; path=/; max-age=${60*60*24*7}`;
      
      logger.debug('[OnboardingUtils] Updated cookies for immediate status change', {
        requestId,
        elapsedMs: performance.now() - startTime
      });
    }
    
    logger.debug('[OnboardingUtils] Onboarding completion process finished', {
      requestId,
      success: attributeUpdateSuccess,
      elapsedMs: performance.now() - startTime
    });
    
    return attributeUpdateSuccess;
  } catch (error) {
    logger.error('[OnboardingUtils] Failed to complete onboarding:', {
      error: error.message,
      code: error.code,
      stack: error.stack
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
  logger.debug('[OnboardingUtils] Validating business info:', data);

  const {
    businessName,
    businessType,
    businessSubtypes = '',
    country,
    businessState = '',
    legalStructure,
    dateFounded,
    businessId = crypto.randomUUID()
  } = data;

  const errors = [];

  if (!businessName || businessName.trim().length < 2) {
    errors.push({ field: 'businessName', message: 'Business name must be at least 2 characters' });
  }

  if (!businessType) {
    errors.push({ field: 'businessType', message: 'Business type is required' });
  }

  if (!legalStructure) {
    errors.push({ field: 'legalStructure', message: 'Legal structure is required' });
  }

  if (!dateFounded) {
    errors.push({ field: 'dateFounded', message: 'Date founded is required' });
  }

  if (!country) {
    errors.push({ field: 'country', message: 'Country is required' });
  }

  if (errors.length > 0) {
    logger.error('[OnboardingUtils] Business info validation failed:', {
      errors,
      data
    });
    const error = new Error('Validation failed');
    error.fields = errors;
    throw error;
  }

  logger.debug('[OnboardingUtils] Business info validation successful:', {
    businessId,
    businessName,
    businessType
  });

  // Generate a properly formatted version string (v1.0.0)
  const attrVersion = 'v1.0.0';
  logger.debug('[OnboardingUtils] Setting attribute version:', { attrVersion });

  // Format attributes for Cognito
  return {
    'custom:businessid': businessId,
    'custom:businessname': businessName,
    'custom:businesstype': businessType,
    'custom:businesssubtypes': businessSubtypes,
    'custom:businesscountry': country,
    'custom:businessstate': businessState,
    'custom:legalstructure': legalStructure,
    'custom:datefounded': dateFounded,
    'custom:onboarding': 'BUSINESS_INFO',
    'custom:updated_at': new Date().toISOString(),
    'custom:acctstatus': 'ACTIVE',
    'custom:attrversion': attrVersion // Using semantic versioning format
  };
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