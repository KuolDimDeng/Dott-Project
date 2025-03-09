import { fetchAuthSession, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

export async function validateSession(providedTokens) {
  try {
    let tokens = providedTokens;

    // Server-side handling
    if (typeof window === 'undefined') {
      if (!tokens?.accessToken || !tokens?.idToken) {
        throw new Error('No valid session tokens provided for server-side operation');
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

    // If still no valid tokens, get fresh session
    if (!tokens?.accessToken || !tokens?.idToken) {
      logger.debug('[OnboardingUtils] No valid tokens, fetching fresh session');
      const session = await fetchAuthSession();
      tokens = {
        accessToken: session.tokens.accessToken.toString(),
        idToken: session.tokens.idToken.toString()
      };

      document.cookie = `idToken=${tokens.idToken}; path=/`;
      document.cookie = `accessToken=${tokens.accessToken}; path=/`;
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

    // Server-side update using Cognito API directly
    if (typeof window === 'undefined') {
      const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.UpdateUserAttributes',
          'Authorization': `Bearer ${validTokens.accessToken}`
        },
        body: JSON.stringify({
          AccessToken: validTokens.accessToken,
          UserAttributes: Object.entries(formattedAttributes).map(([key, value]) => ({
            Name: key,
            Value: value
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update attributes: ${response.status}`);
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