import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';

/**
 * API route to set auth cookies - DEPRECATED
 * 
 * ⚠️ DEPRECATED: This route is maintained only for backward compatibility.
 * ⚠️ DO NOT USE IN NEW CODE.
 * 
 * New implementations MUST use Cognito attributes directly instead of cookie-based state.
 * The entire auth system has transitioned to use Cognito user attributes exclusively.
 * 
 * Alternative approaches:
 * - For tenant ID: Use getTenantIdFromCognito() from tenantUtils.js
 * - For user data: Use fetchUserAttributes() from aws-amplify/auth
 * - For authentication: Use getCurrentUser() from aws-amplify/auth
 */
export async function POST(request) {
  try {
    const { 
      idToken, 
      accessToken, 
      refreshToken, 
      onboardingStep, 
      onboardedStatus, 
      setupCompleted, 
      rememberMe, 
      maxAge,
      tenantId,
      updateCognito = true // Default to also updating Cognito attributes
    } = await request.json();
    
    if (!idToken || !accessToken) {
      logger.error('[API] Missing required tokens for set-cookies:', { 
        hasIdToken: !!idToken, 
        hasAccessToken: !!accessToken 
      });
      return NextResponse.json(
        { error: 'Missing required tokens' },
        { status: 400 }
      );
    }

    logger.warn('[API] DEPRECATED: Using set-cookies route. This API will be removed in future. Use Cognito attributes instead.', {
      hasIdToken: !!idToken,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      onboardingStep,
      onboardedStatus,
      setupCompleted,
      hasTenantId: !!tenantId,
      willUpdateCognito: updateCognito
    });
    
    // If updateCognito flag is true, make sure to update Cognito attributes (primary source of truth)
    if (updateCognito) {
      try {
        // Dynamically import Amplify auth to ensure it only runs client-side
        const { updateUserAttributes } = await import('aws-amplify/auth');
        
        // Build attributes object based on provided values
        const userAttributes = {};
        
        if (onboardingStep || onboardedStatus) {
          userAttributes['custom:onboarding'] = onboardedStatus || onboardingStep;
        }
        
        if (setupCompleted !== undefined) {
          userAttributes['custom:setupdone'] = setupCompleted ? 'TRUE' : 'FALSE';
        }
        
        if (tenantId) {
          userAttributes['custom:tenant_id'] = tenantId;
          userAttributes['custom:businessid'] = tenantId;
        }
        
        // Add timestamp for tracking
        userAttributes['custom:updated_at'] = new Date().toISOString();
        
        // Only make the API call if we have attributes to update
        if (Object.keys(userAttributes).length > 0) {
          await updateUserAttributes({ userAttributes });
          logger.info('[API] Successfully updated Cognito attributes:', Object.keys(userAttributes));
        }
      } catch (cognitoError) {
        // This is now considered a more significant error since Cognito is our primary source of truth
        logger.error('[API] Failed to update Cognito attributes:', cognitoError);
        return NextResponse.json({ 
          error: 'Failed to update Cognito attributes', 
          message: 'Authentication state requires Cognito updates. Please try again.',
          details: cognitoError.message
        }, { status: 500 });
      }
    }
    
    // Set cookies for backward compatibility only
    logger.debug('[API] Setting cookies for backward compatibility only');
    
    const isDev = process.env.NODE_ENV === 'development';
    // Use provided maxAge or determine based on rememberMe flag
    const defaultMaxAge = rememberMe ? 
      30 * 24 * 60 * 60 : // 30 days for rememberMe
      24 * 60 * 60;      // 24 hours for standard session
      
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: !isDev,
      sameSite: isDev ? 'lax' : 'strict',
      maxAge: maxAge || defaultMaxAge // Use provided maxAge or calculate based on rememberMe
    };

    const response = NextResponse.json({ 
      success: true,
      cognito_updated: updateCognito,
      message: '⚠️ DEPRECATED: Auth cookies set only for backward compatibility. Use Cognito attributes in new code.'
    });
    
    // Set cookies with proper HTTP headers (for backward compatibility)
    response.cookies.set('idToken', idToken, cookieOptions);
    response.cookies.set('accessToken', accessToken, cookieOptions);
    
    // Set authToken cookie which is used by middleware for authentication detection
    response.cookies.set('authToken', 'true', {
      ...cookieOptions,
      httpOnly: false,  // Make accessible to JS
    });
    
    if (refreshToken) {
      // For refresh token, always use a longer expiry - either the rememberMe duration or at least 7 days
      const refreshTokenMaxAge = rememberMe ? 
        30 * 24 * 60 * 60 : // 30 days for rememberMe
        7 * 24 * 60 * 60;  // 7 days for standard session
        
      response.cookies.set('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: refreshTokenMaxAge
      });
    }
    
    // Set tenant ID if provided
    if (tenantId) {
      response.cookies.set('tenantId', tenantId, cookieOptions);
      response.cookies.set('businessid', tenantId, cookieOptions); // For backward compatibility
    }
    
    // Extract onboarding status from token for verification
    let cognitoOnboardingStatus = null;
    let cognitoSetupDone = false;
    let cognitoSubPlan = null;
    let cognitoTenantId = null;
    
    try {
      const decodedToken = parseJwt(idToken);
      cognitoOnboardingStatus = decodedToken['custom:onboarding'];
      cognitoSetupDone = (decodedToken['custom:setupdone'] || '').toLowerCase() === 'true';
      cognitoSubPlan = (decodedToken['custom:subplan'] || decodedToken['custom:subscription_plan'] || '').toLowerCase();
      cognitoTenantId = decodedToken['custom:tenant_id'] || decodedToken['custom:businessid'];
      
      logger.debug('[API] Extracted attributes from token:', { 
        cognitoOnboardingStatus,
        cognitoSetupDone,
        cognitoSubPlan,
        cognitoTenantId
      });
      
      // Fix free plan users who are stuck in subscription status
      const isFreePlan = cognitoSubPlan === 'free' || cognitoSubPlan === 'basic';
      const isStuckInSubscription = cognitoOnboardingStatus?.toLowerCase() === 'subscription' && isFreePlan;
      
      if (isStuckInSubscription) {
        logger.info('[API] Detected free plan user stuck in subscription status, fixing to complete');
        cognitoOnboardingStatus = 'complete';
        cognitoSetupDone = true;
        
        // Update the Cognito attribute if we're fixing this issue
        if (updateCognito) {
          try {
            const { updateUserAttributes } = await import('aws-amplify/auth');
            await updateUserAttributes({ 
              userAttributes: {
                'custom:onboarding': 'complete',
                'custom:setupdone': 'TRUE'
              }
            });
            logger.info('[API] Fixed stuck subscription status in Cognito');
          } catch (fixError) {
            logger.error('[API] Failed to fix subscription status in Cognito:', fixError);
          }
        }
      }
    } catch (parseError) {
      logger.warn('[API] Failed to parse JWT for onboarding status:', parseError);
    }
    
    // Set backward compatibility cookies based on Cognito data
    const finalOnboardingStatus = onboardedStatus || cognitoOnboardingStatus || 'not_started';
    const finalOnboardingStep = onboardingStep || (finalOnboardingStatus === 'complete' ? 'complete' : 'business-info');
    
    // Set the determined onboarding cookies for backward compatibility only
    response.cookies.set('onboardingStep', finalOnboardingStep, cookieOptions);
    response.cookies.set('onboardedStatus', finalOnboardingStatus, cookieOptions);
    
    logger.debug('[API] Set final onboarding cookies for backward compatibility only:', { 
      onboardingStep: finalOnboardingStep,
      onboardedStatus: finalOnboardingStatus
    });
    
    // Set setupCompleted cookie based on determined state
    const isSetupComplete = setupCompleted !== undefined ? 
      !!setupCompleted : 
      (cognitoSetupDone || finalOnboardingStatus === 'complete');
    
    response.cookies.set('setupCompleted', isSetupComplete ? 'true' : 'false', {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 // 30 days - longer expiry for this cookie
    });
    
    logger.debug('[API] Set setupCompleted cookie:', { setupCompleted: isSetupComplete });
    logger.info('[API] DEPRECATED: Auth cookies set for backward compatibility only. Primary data stored in Cognito.');
    
    return response;
  } catch (error) {
    logger.error('[API] Error setting auth state:', error);
    return NextResponse.json(
      { error: 'Error setting auth state', message: error.message },
      { status: 500 }
    );
  }
}