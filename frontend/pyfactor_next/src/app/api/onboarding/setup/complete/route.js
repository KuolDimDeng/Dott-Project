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
    // Update Cognito attributes directly with explicit strings
    await updateUserAttributes({
      userAttributes: {
        'custom:onboarding': 'COMPLETE',
        'custom:setupdone': 'TRUE',
        'custom:updated_at': new Date().toISOString()
      }
    });
    
    logger.info('[SetupAPI] Updated Cognito attributes successfully', {
      requestId,
      attributes: ['custom:onboarding', 'custom:setupdone', 'custom:updated_at']
    });
    
    return true;
  } catch (error) {
    logger.error('[SetupAPI] Failed to update Cognito attributes:', {
      requestId,
      error: error.message
    });
    
    // Fallback to API call
    try {
      const response = await fetch('/api/user/update-attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attributes: {
            'custom:onboarding': 'COMPLETE',
            'custom:setupdone': 'TRUE',
            'custom:updated_at': new Date().toISOString()
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

export async function POST(request) {
  const requestId = uuidv4();
  logger.info('[SetupAPI] Starting setup completion', { requestId });

  try {
    // Configure Amplify if needed (server-side)
    getAmplifyConfig();

    // Get authentication token
    const headers = new Headers(request.headers);
    const authHeader = headers.get('Authorization') || headers.get('authorization');
    const cookieHeader = headers.get('cookie');
    const accessToken = getToken(request);

    // Enhanced logging
    logger.debug('[SetupAPI] Authentication details:', {
      requestId,
      hasAuthHeader: !!authHeader,
      hasCookieHeader: !!cookieHeader,
      hasAccessToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : null
    });

    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'No valid session',
          details: {
            hasAuthHeader: !!authHeader,
            hasCookieHeader: !!cookieHeader
          }
        },
        { status: 401 }
      );
    }

    // Verify token
    const isValidToken = await verifyToken(accessToken, requestId);
    if (!isValidToken) {
      return NextResponse.json(
        {
          error: 'Invalid or expired token',
          details: {
            tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : null
          }
        },
        { status: 401 }
      );
    }

    // Check backend health
    const isBackendHealthy = await checkBackendHealth(requestId);
    let backendUpdateSuccess = false;
    
    // Only attempt backend API call if backend is healthy
    if (isBackendHealthy) {
      try {
        const requestHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Request-ID': requestId,
          'Origin': 'http://localhost:3000'
        };

        const response = await fetch('http://localhost:8000/api/onboarding/setup/complete/', {
          method: 'POST',
          headers: requestHeaders,
          cache: 'no-store'
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error('[SetupAPI] Setup completion failed:', {
            requestId,
            status: response.status,
            error: errorData.error || errorData.message || 'Unknown error'
          });
        } else {
          const data = await response.json();
          logger.info('[SetupAPI] Setup completed successfully by backend', {
            requestId,
            setupStatus: data.status,
            nextStep: data.next_step
          });
          backendUpdateSuccess = true;
        }
      } catch (error) {
        logger.error('[SetupAPI] Setup completion request failed:', {
          requestId,
          error: error.message
        });
      }
    }

    // Always update Cognito attributes directly, even if backend succeeded
    // This ensures consistency and avoids race conditions in status updates
    const attributesUpdated = await updateCognitoAttributes(requestId, accessToken);
    
    if (!backendUpdateSuccess && !attributesUpdated) {
      return NextResponse.json(
        {
          error: 'Failed to update onboarding status',
          details: 'Both backend and direct methods failed'
        },
        { status: 500 }
      );
    }

    // Set cookies in the response
    const response = NextResponse.json({
      success: true,
      message: 'Setup completed successfully',
      status: 'COMPLETE',
      next_step: '/dashboard',
      requestId,
    });

    // Set cookies
    const cookieOptions = {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: 'lax',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production'
    };

    response.cookies.set('onboardingStep', 'COMPLETE', cookieOptions);
    response.cookies.set('onboardedStatus', 'COMPLETE', cookieOptions);
    response.cookies.set('setupCompleted', 'true', cookieOptions);

    return response;
  } catch (error) {
    logger.error('[SetupAPI] Unexpected error during setup completion:', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      {
        error: error.message,
        requestId,
        details: { stack: error.stack }
      },
      { status: error.status || 500 }
    );
  }
}