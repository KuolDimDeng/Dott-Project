import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { Amplify } from 'aws-amplify';
import { getAmplifyConfig } from '../../../config/amplify';

// Helper to get token from cookie string
function getTokenFromCookie(cookieString, tokenName) {
  if (!cookieString) return null;
  const cookies = cookieString.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith(`${tokenName}=`));
  return tokenCookie ? tokenCookie.split('=')[1].trim() : null;
}

export async function POST(request) {
  try {
    // Parse request body first to fail fast if invalid
    const body = await request.json();
    const { userId, setup_options } = body;

    if (!userId || !setup_options) {
      return NextResponse.json(
        { error: 'User ID and setup options are required' },
        { status: 400 }
      );
    }

    // Validate setup options
    const { selected_plan, billing_cycle } = setup_options;
    if (!selected_plan || !billing_cycle) {
      return NextResponse.json(
        { error: 'Plan selection and billing cycle are required' },
        { status: 400 }
      );
    }

    // Validate plan type
    if (!['free', 'professional'].includes(selected_plan)) {
      return NextResponse.json(
        { error: 'Invalid plan selection' },
        { status: 400 }
      );
    }

    // Validate billing cycle
    if (!['monthly', 'annual'].includes(billing_cycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle' },
        { status: 400 }
      );
    }

    // Configure Amplify in server context
    try {
      Amplify.configure(getAmplifyConfig());
    } catch (configError) {
      logger.error('[SetupAPI] Amplify configuration failed:', configError);
      return NextResponse.json(
        { error: 'Failed to configure authentication' },
        { status: 500 }
      );
    }

    // Get the session token from request headers or cookies
    const cookieHeader = request.headers.get('cookie');
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    
    if (!API_URL) {
      throw new Error('NEXT_PUBLIC_API_URL is not configured');
    }

    // Get access token from cookie
    const accessToken = getTokenFromCookie(cookieHeader, 'accessToken');

    logger.debug('[SetupAPI] Auth details:', {
      hasCookieHeader: !!cookieHeader,
      hasAccessToken: !!accessToken
    });

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No valid session' },
        { status: 401 }
      );
    }

    // Set up headers for all requests
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    logger.debug('[SetupAPI] Request headers:', {
      headers,
      accessToken: accessToken ? 'present' : 'missing'
    });

    // Check backend health
    try {
      const healthResponse = await fetch(`${API_URL}/api/onboarding/database/health/`, {
        method: 'GET',
        headers,
        cache: 'no-store',
        credentials: 'include'
      });

      const healthData = await healthResponse.json();
      
      if (!healthResponse.ok) {
        logger.error('[SetupAPI] Backend health check failed:', {
          status: healthResponse.status,
          statusText: healthResponse.statusText,
          data: healthData
        });

        if (healthResponse.status === 401) {
          return NextResponse.json(
            {
              error: 'Session expired',
              details: 'Your session has expired. Please sign out and sign in again.'
            },
            { status: 401 }
          );
        }

        return NextResponse.json(
          {
            error: 'Backend service is not ready',
            details: healthData.error || healthData.message || 'The system is still initializing. Please try again in a few moments.'
          },
          { status: 503 }
        );
      }

      logger.debug('[SetupAPI] Health check successful:', {
        status: healthResponse.status,
        data: healthData
      });

      // Make request to backend to create user database
      const response = await fetch(`${API_URL}/api/onboarding/setup/`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          setup_options: {
            selected_plan: setup_options.selected_plan,
            billing_cycle: setup_options.billing_cycle
          }
        }),
        cache: 'no-store'
      });

      const data = await response.json();
      
      if (!response.ok) {
        logger.error('[SetupAPI] Setup failed:', {
          status: response.status,
          data: data,
          userId: userId
        });

        // Handle specific error cases
        if (response.status === 404) {
          return NextResponse.json(
            { error: 'User profile not found. Please complete your business information first.' },
            { status: 404 }
          );
        } else if (response.status === 409) {
          return NextResponse.json(
            { error: 'Setup is already in progress. Please wait for it to complete.' },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { error: data.message || 'Failed to setup user database' },
          { status: response.status }
        );
      }

      logger.debug('[SetupAPI] Setup initiated successfully:', {
        userId,
        taskId: data.task_id,
        status: data.status,
        setupDetails: data.setup_details || {}
      });

      return NextResponse.json(data);

    } catch (error) {
      const isConnectionRefused = error.message.includes('ECONNREFUSED');
      const isFetchFailed = error.message.includes('fetch failed');
      
      logger.error('[SetupAPI] Backend request failed:', {
        error: error.message,
        type: error.name,
        code: error.code,
        isConnectionRefused,
        isFetchFailed
      });

      if (isConnectionRefused) {
        return NextResponse.json(
          {
            error: 'Backend service is not running',
            details: 'Please ensure the backend server is running and accessible'
          },
          { status: 503 }
        );
      }

      if (isFetchFailed) {
        return NextResponse.json(
          {
            error: 'Cannot connect to backend service',
            details: 'Please check your network connection and backend server status'
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to communicate with backend service. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('[SetupAPI] Setup failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
}