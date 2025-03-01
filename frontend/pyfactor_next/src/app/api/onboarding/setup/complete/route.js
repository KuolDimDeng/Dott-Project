///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/setup/complete/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { Amplify } from 'aws-amplify';
import { getAmplifyConfig } from '../../../../../config/amplify';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(request) {
  const requestId = uuidv4();
  logger.info('[SetupAPI] Starting setup completion', { requestId });

  try {
    // Configure Amplify
    try {
      Amplify.configure(getAmplifyConfig());
    } catch (configError) {
      logger.error('[SetupAPI] Amplify configuration failed:', {
        requestId,
        error: configError.message
      });
      return NextResponse.json(
        { error: 'Failed to configure authentication' },
        { status: 500 }
      );
    }

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
    if (!isBackendHealthy) {
      return NextResponse.json(
        { error: 'Backend service is not available. Please ensure the backend server is running.' },
        { status: 503 }
      );
    }

    // Complete setup
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
        throw new Error(errorData.error || errorData.message || 'Failed to complete setup process');
      }

      const data = await response.json();
      logger.info('[SetupAPI] Setup completed successfully', {
        requestId,
        setupStatus: data.status,
        nextStep: data.next_step
      });

      return NextResponse.json({
        ...data,
        requestId
      });
    } catch (error) {
      logger.error('[SetupAPI] Setup completion request failed:', {
        requestId,
        error: error.message
      });
      return NextResponse.json(
        {
          error: 'Failed to communicate with backend service. Please try again.',
          requestId,
          details: { errorMessage: error.message }
        },
        { status: 500 }
      );
    }
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