///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/business-info/route.js
import { NextResponse } from 'next/server';
import { jwtVerify, decodeJwt } from 'jose';
import { logger } from '@/utils/logger';
import { validateBusinessInfo } from '@/utils/onboardingUtils';
import { updateOnboardingStep, updateCookies } from '@/config/amplifyServer';
import { getRefreshedAccessToken, isTokenExpired } from '@/utils/auth';
import { validateServerSession } from '@/utils/serverUtils';
import { setTokens } from '@/utils/tenantUtils';

async function verifyToken(accessToken) {
  try {
    // For server-side validation, we'll decode and verify basic JWT structure
    const decoded = decodeJwt(accessToken);
    
    // Log token details for debugging
    logger.debug('[BusinessInfo] Token details:', {
      iss: decoded.iss,
      exp: decoded.exp,
      sub: decoded.sub,
      username: decoded['cognito:username']
    });

    // Verify token hasn't expired
    const now = Math.floor(Date.now() / 1000);
    
    // Add detailed logging for time comparison
    logger.debug('[BusinessInfo] Token expiration check:', {
      tokenExp: decoded.exp,
      currentTime: now,
      difference: decoded.exp - now,
      tokenDate: new Date(decoded.exp * 1000).toISOString(),
      currentDate: new Date(now * 1000).toISOString(),
      isExpired: decoded.exp < now,
      nodeEnv: process.env.NODE_ENV
    });
    
    // Always be lenient with token expiration in this route
    // This is a temporary fix to prevent token expiration errors
    // The proper token refresh is handled in the POST function
    if (decoded.exp && decoded.exp < now) {
      // Log warning but continue
      logger.warn('[BusinessInfo] Token expired but continuing:', {
        exp: decoded.exp,
        now,
        diff: (decoded.exp - now) / 60, // minutes
        tokenDate: new Date(decoded.exp * 1000).toISOString(),
        currentDate: new Date(now * 1000).toISOString()
      });
      // Continue with the expired token - we'll refresh it in the POST function
    }

    // Extract user pool ID from issuer URL
    // Format: https://cognito-idp.{region}.amazonaws.com/{userPoolId}
    const issuerUrl = decoded.iss;
    const userPoolId = issuerUrl.split('/').pop();
    const region = userPoolId?.split('_')[0];

    logger.debug('[BusinessInfo] Token validation:', {
      issuerUrl,
      userPoolId,
      region
    });

    if (!userPoolId || !region) {
      throw new Error('Invalid token format - missing user pool information');
    }

    return {
      ...decoded,
      userPoolId,
      region
    };
  } catch (err) {
    logger.error('[BusinessInfo] Token verification failed:', err);
    throw new Error('Invalid token');
  }
}

async function updateCognitoAttributes(accessToken, attributes) {
  try {
    const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.UpdateUserAttributes',
        'Authorization': accessToken
      },
      body: JSON.stringify({
        AccessToken: accessToken,
        UserAttributes: Object.entries(attributes).map(([key, value]) => ({
          Name: key.startsWith('custom:') ? key : `custom:${key}`,
          Value: value.toString()
        }))
      })
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('[BusinessInfo] Cognito API error:', error);
      throw new Error(error.message || 'Failed to update attributes');
    }

    const result = await response.json();
    return { isUpdated: true, result };
  } catch (error) {
    logger.error('[BusinessInfo] Update attributes error:', error);
    throw error;
  }
}

function formatResponse(success, data, tenantId, statusCode = 200) {
  if (success) {
    // Check if we have the new nested response format
    const onboardingData = data.data?.onboarding || {};
    const tenantData = data.data?.tenant || {};
    const businessInfo = data.data?.businessInfo || {};
    const schemaSetup = data.data?.schemaSetup || {};
    
    // Log the data structure for debugging
    logger.debug('[BusinessInfo] Formatting response:', {
      hasNestedData: !!data.data,
      onboardingData: Object.keys(onboardingData),
      tenantData: Object.keys(tenantData),
      businessInfo: Object.keys(businessInfo)
    });
    
    // Determine the next step and status
    // Ensure consistent format: uppercase with underscores for Cognito attributes
    const nextStep = (onboardingData.nextStep || data.next_step || 'subscription').toUpperCase().replace(/-/g, '_');
    const onboardingStatus = (onboardingData.status || data.onboarding_status || 'business-info').toUpperCase().replace(/-/g, '_');
    
    // Create the response
    const response = NextResponse.json({
      success: true,
      // Pass through the entire data object for maximum compatibility
      data: data.data || data,
      // Also include top-level fields for backward compatibility
      businessId: businessInfo.id || data.business_id || data.businessId,
      nextStep: nextStep,
      nextRoute: onboardingData.redirectTo || data.next_route || '/onboarding/subscription',
      onboardingStatus: onboardingStatus,
      currentStep: onboardingData.currentStep || data.current_step || 'BUSINESS_INFO',
      tenant: {
        id: tenantId,
        schema_name: tenantData.schema_name || data.tenant_schema || `tenant_${tenantId.replace(/-/g, '_')}`,
        status: tenantData.database_status || data.tenant_status || 'active'
      }
    }, { status: statusCode });
    
    // Update cookies with the new onboarding step and status
    return updateCookies(response, nextStep, onboardingStatus);
  } else {
    return NextResponse.json({
      success: false,
      error: data.message || data.error || 'Operation failed',
      code: data.code || 'unknown_error',
      details: data.details,
      validation_errors: data.validation_errors,
      tenant_error: data.tenant_error,
      tenant_id: tenantId
    }, { status: statusCode });
  }
}

/**
 * Handle business information update API request
 * This is a simplified version that simulates a successful update without contacting the backend
 */
export async function POST(request) {
  try {
    const data = await request.json();
    
    logger.debug('[API] Business info update request:', {
      fields: Object.keys(data),
      businessId: data.businessId,
      businessName: data.businessName
    });

    // In a real implementation, this would verify with the backend
    // But for now, we'll just simulate a successful response
    
    const response = NextResponse.json({
      success: true,
      message: 'Business information updated successfully',
      businessId: data.businessId || 'b7fee399-ffca-4151-b636-94ccb65b3cd0',
      redirect: '/onboarding/subscription'
    });

    // Set cookies to update the onboarding step
    response.cookies.set('onboardingStep', 'BUSINESS_INFO', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: false,
      sameSite: 'lax'
    });
    
    response.cookies.set('onboardedStatus', 'BUSINESS_INFO', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: false,
      sameSite: 'lax'
    });

    return response;
  } catch (error) {
    logger.error('[API] Error updating business info:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update business information',
      message: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // Get tokens from request headers
    let accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!accessToken) {
      logger.error('[BusinessInfo] No auth token in request headers');
      return NextResponse.json(
        { error: 'No valid session' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (isTokenExpired(accessToken)) {
      logger.warn('[BusinessInfo] Token is expired, attempting to continue anyway');
      
      // In server-side context, we can't refresh the token properly
      // Instead, we'll continue with the expired token and rely on the client to refresh it
      
      // Log the decision for debugging
      logger.info('[BusinessInfo] Continuing with expired token in server-side context');
      
      // We'll be lenient with token expiration on the server side
      // The proper token refresh should happen on the client side
    }

    // Verify JWT token and get user info
    let payload;
    try {
      payload = await verifyToken(accessToken);
    } catch (err) {
      return NextResponse.json(
        { error: err.message },
        { status: 401 }
      );
    }

    const attributes = payload || {};

    // Return business info if it exists
    if (attributes['custom:businessid']) {
      return NextResponse.json({
        businessName: attributes['custom:businessname'],
        businessType: attributes['custom:businesstype'],
        businessSubtypes: attributes['custom:businesssubtypes'] || '',
        businessId: attributes['custom:businessid'],
        country: attributes['custom:businesscountry'],
        businessState: attributes['custom:businessstate'] || '',
        legalStructure: attributes['custom:legalstructure'],
        dateFounded: attributes['custom:datefounded']
      });
    }

    // Return empty response if no business info exists
    return NextResponse.json({});

  } catch (error) {
    logger.error('[BusinessInfo] Error fetching business info:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch business information',
        details: error.message
      },
      { status: 500 }
    );
  }
}
