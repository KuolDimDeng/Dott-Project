///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/setup/complete/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAmplifyConfig } from '@/config/amplifyServer';
import { v4 as uuidv4 } from 'uuid';
import { fetchAuthSession, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';

// Helper to get token from cookie string
function getTokenFromCookie(cookieString, tokenName) {
  if (!cookieString) return null;
  const cookies = cookieString.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith(`${tokenName}=`));
  return tokenCookie ? tokenCookie.split('=')[1].trim() : null;
}

// Get token with fallbacks
function getToken(request) {
  const headers = new Headers(request.headers);
  const authHeader = headers.get('Authorization') || headers.get('authorization');
  const cookieHeader = headers.get('cookie');
  
  let accessToken = null;
  
  // Try Authorization header
  if (authHeader?.startsWith('Bearer ')) {
    accessToken = authHeader.split(' ')[1];
  }
  
  // Try cookie
  if (!accessToken) {
    accessToken = getTokenFromCookie(cookieHeader, 'accessToken');
  }
  
  // Try session storage (if available)
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = sessionStorage.getItem('accessToken');
  }
  
  return accessToken;
}

// Token verification with proper error handling
async function verifyToken(token, requestId) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Request-ID': requestId,
      'Origin': 'http://localhost:3000'
    };

    // Try POST first
    let response = await fetch('http://localhost:8000/api/token/verify/', {
      method: 'POST',
      headers,
      body: JSON.stringify({ token })
    });

    if (response.status === 405) { // Method not allowed, try GET
      response = await fetch('http://localhost:8000/api/token/verify/', {
        method: 'GET',
        headers
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('[SetupAPI] Token verification failed:', {
        requestId,
        status: response.status,
        error: errorData.error || 'Unknown error'
      });
      return false;
    }

    const data = await response.json();
    return data.is_valid === true;
  } catch (error) {
    logger.error('[SetupAPI] Token verification error:', {
      requestId,
      error: error.message
    });
    return false;
  }
}

// Check backend health
async function checkBackendHealth(requestId) {
  try {
    const response = await fetch('http://localhost:8000/health/', {
      method: 'GET',
      headers: {
        'X-Request-ID': requestId,
        'Origin': 'http://localhost:3000'
      },
      cache: 'no-store'
    });
    return response.ok;
  } catch (error) {
    logger.error('[SetupAPI] Backend health check failed:', {
      requestId,
      error: error.message
    });
    return false;
  }
}

// Update cognito attributes directly
async function updateCognitoAttributes(requestId, token) {
  try {
    // Get user info to check plan and tenant ID
    let plan = 'free';
    let tenantId = '';
    
    try {
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      const userAttributes = await fetchUserAttributes();
      
      // Extract values from existing attributes
      plan = userAttributes['custom:subplan'] || 'free';
      tenantId = userAttributes['custom:tenant_ID'] || userAttributes['custom:businessid'] || '';
    } catch (attributeError) {
      logger.warn('[SetupAPI] Could not fetch current attributes:', {
        requestId,
        error: attributeError.message
      });
    }
    
    // Current timestamp for consistency
    const timestamp = new Date().toISOString();
    
    // Update Cognito attributes directly with lowercase strings and all required fields
    await updateUserAttributes({
      userAttributes: {
        'custom:onboarding': 'complete',
        'custom:setupdone': 'true',
        'custom:acctstatus': 'active',
        'custom:subplan': plan,
        'custom:subscriptioninterval': 'monthly',
        'custom:updated_at': timestamp,
        'custom:setupcompletedtime': timestamp,
        'custom:onboardingCompletedAt': timestamp,
        'custom:payverified': plan === 'free' ? 'false' : 'true'
      }
    });
    
    logger.info('[SetupAPI] Updated Cognito attributes successfully', {
      requestId,
      plan,
      attributes: [
        'custom:onboarding', 
        'custom:setupdone', 
        'custom:updated_at',
        'custom:subplan',
        'custom:acctstatus'
      ]
    });
    
    return true;
  } catch (error) {
    logger.error('[SetupAPI] Failed to update Cognito attributes:', {
      requestId,
      error: error.message
    });
    
    // Fallback to API call
    try {
      // Current timestamp for consistency
      const timestamp = new Date().toISOString();
      
      const response = await fetch('/api/user/update-attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attributes: {
            'custom:onboarding': 'complete',
            'custom:setupdone': 'true',
            'custom:acctstatus': 'active',
            'custom:subplan': 'free', // Default to free for fallback
            'custom:subscriptioninterval': 'monthly',
            'custom:updated_at': timestamp,
            'custom:setupcompletedtime': timestamp,
            'custom:onboardingCompletedAt': timestamp,
            'custom:payverified': 'false'
          },
          forceUpdate: true
        })
      });
      
      if (response.ok) {
        logger.info('[SetupAPI] Updated attributes via API call', { requestId });
        return true;
      } else {
        throw new Error(`API call failed with status ${response.status}`);
      }
    } catch (apiError) {
      logger.error('[SetupAPI] Failed to update attributes via API:', {
        requestId,
        error: apiError.message
      });
      return false;
    }
  }
}

/**
 * API endpoint to force mark onboarding as complete
 * This endpoint has admin privileges for updating user attributes
 * and should be used as a last resort when other methods fail
 */
export async function POST(request) {
  // Generate a request ID for tracking
  const requestId = request.headers.get('X-Request-ID') || uuidv4();
  logger.info(`[setup/complete:${requestId}] Request received`);
  
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const forceUpdate = body?.forceComplete === true;
    
    // Get the access token from request
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    // Determine if this is a forced update
    const isForceUpdate = forceUpdate || request.headers.get('X-Force-Update') === 'true';
    
    logger.info(`[setup/complete:${requestId}] Processing request`, { 
      forceUpdate: isForceUpdate, 
      hasAccessToken: !!accessToken 
    });
    
    // Try to get the user attributes
    let userId = null;
    
    // First try to get the user ID from the token
    if (accessToken) {
      try {
        // Attempt to decode the JWT token
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
          userId = payload.sub;
          logger.info(`[setup/complete:${requestId}] Extracted user ID from token: ${userId}`);
        }
      } catch (tokenError) {
        logger.warn(`[setup/complete:${requestId}] Error extracting user ID from token:`, tokenError.message);
      }
    }
    
    // If we couldn't get the user ID from the token, try to get it from the request body
    if (!userId && body.userId) {
      userId = body.userId;
      logger.info(`[setup/complete:${requestId}] Using user ID from request body: ${userId}`);
    }
    
    // If we still don't have a user ID, check for user email in the request body
    let userEmail = null;
    if (body.email) {
      userEmail = body.email;
      logger.info(`[setup/complete:${requestId}] Using email from request body: ${userEmail}`);
    }
    
    // If we have neither user ID nor email, this is an error
    if (!userId && !userEmail) {
      logger.error(`[setup/complete:${requestId}] No user identification provided`);
      return NextResponse.json({
        success: false,
        error: 'No user identification provided',
        message: 'Either user ID or email must be provided'
      }, { status: 400 });
    }
    
    // Update Cognito attributes using our admin permissions
    try {
      // Import AWS SDK dynamically to ensure it only loads on the server
      const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, ListUsersCommand } = 
        await import('@aws-sdk/client-cognito-identity-provider');
      
      // Get AWS credentials from environment variables
      const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
      const userPoolId = process.env.COGNITO_USER_POOL_ID;
      
      if (!userPoolId) {
        logger.error(`[setup/complete:${requestId}] Missing user pool ID in environment variables`);
        throw new Error('Server configuration error: Missing user pool ID');
      }
      
      // Initialize Cognito client
      const client = new CognitoIdentityProviderClient({ region });
      
      // If we only have email, we need to find the user ID first
      if (!userId && userEmail) {
        logger.info(`[setup/complete:${requestId}] Looking up user by email: ${userEmail}`);
        
        const listUsersCommand = new ListUsersCommand({
          UserPoolId: userPoolId,
          Filter: `email = "${userEmail}"`,
          Limit: 1
        });
        
        const listUsersResult = await client.send(listUsersCommand);
        
        if (listUsersResult.Users && listUsersResult.Users.length > 0) {
          userId = listUsersResult.Users[0].Username;
          logger.info(`[setup/complete:${requestId}] Found user ID for email: ${userId}`);
        } else {
          logger.error(`[setup/complete:${requestId}] User not found for email: ${userEmail}`);
          throw new Error(`User not found for email: ${userEmail}`);
        }
      }
      
      // Now update the user attributes
      logger.info(`[setup/complete:${requestId}] Updating attributes for user: ${userId}`);
      
      const updateCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: userId,
        UserAttributes: [
          {
            Name: 'custom:onboarding',
            Value: 'complete' // Always lowercase for consistency
          },
          {
            Name: 'custom:setupdone',
            Value: 'true'
          },
          {
            Name: 'custom:updated_at',
            Value: new Date().toISOString()
          },
          {
            Name: 'custom:onboardingCompletedAt',
            Value: new Date().toISOString()
          }
        ]
      });
      
      await client.send(updateCommand);
      
      logger.info(`[setup/complete:${requestId}] Successfully updated user attributes in Cognito`);
      
      return NextResponse.json({
        success: true,
        message: 'Onboarding marked as complete',
        userId,
        requestId
      });
    } catch (awsError) {
      logger.error(`[setup/complete:${requestId}] AWS error updating user attributes:`, awsError);
      
      // Fall back to regular update if we have the access token
      if (accessToken) {
        try {
          logger.info(`[setup/complete:${requestId}] Trying fallback method with access token`);
          
          // Make the direct request using the standard Cognito API
          const cognitoEndpoint = `https://cognito-idp.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazonaws.com/`;
          
          const response = await fetch(cognitoEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-amz-json-1.1',
              'X-Amz-Target': 'AWSCognitoIdentityProviderService.UpdateUserAttributes',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              AccessToken: accessToken,
              UserAttributes: [
                { Name: 'custom:onboarding', Value: 'complete' },
                { Name: 'custom:setupdone', Value: 'true' },
                { Name: 'custom:updated_at', Value: new Date().toISOString() }
              ]
            })
          });
          
          if (response.ok) {
            logger.info(`[setup/complete:${requestId}] Successfully updated attributes with fallback method`);
            
            return NextResponse.json({
              success: true,
              message: 'Onboarding marked as complete using fallback method',
              userId,
              requestId
            });
          } else {
            throw new Error(`Fallback request failed with status: ${response.status}`);
          }
        } catch (fallbackError) {
          logger.error(`[setup/complete:${requestId}] Fallback method failed:`, fallbackError);
          throw fallbackError;
        }
      } else {
        throw awsError;
      }
    }
  } catch (error) {
    logger.error(`[setup/complete:${requestId}] Error completing onboarding:`, error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      requestId
    }, { status: 500 });
  }
}