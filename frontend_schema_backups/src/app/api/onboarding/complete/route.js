import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';

/**
 * API endpoint to mark onboarding as complete
 * This calls the backend to ensure the user's onboarding status is updated
 */
export async function POST(request) {
  try {
    // Validate the user's session
    const { user, tokens } = await validateServerSession();
    
    if (!user || !tokens?.idToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the backend API URL from environment variables
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://127.0.0.1:8000';
    const endpoint = `/api/onboarding/complete/`;
    const requestUrl = `${backendUrl}${endpoint}`;
    
    // Make the request to the backend
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`,
        'X-Id-Token': tokens.idToken,
      },
      body: JSON.stringify({
        force_complete: true,
        attributes: {
          'custom:onboarding': 'complete',
          'custom:setupdone': 'true',
          'custom:acctstatus': 'ACTIVE',
          'custom:updated_at': new Date().toISOString()
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      logger.info('[API] Onboarding completed successfully via backend');
      
      // Also update the user's cookies
      const cookieResponse = NextResponse.json({
        success: true,
        message: 'Onboarding completed successfully',
        data
      });
      
      // Set cookies to reflect the updated onboarding status
      cookieResponse.cookies.set('onboardingStep', 'COMPLETE', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        httpOnly: false,
        sameSite: 'lax'
      });
      
      cookieResponse.cookies.set('onboardedStatus', 'COMPLETE', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        httpOnly: false,
        sameSite: 'lax'
      });
      
      cookieResponse.cookies.set('setupCompleted', 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        httpOnly: false,
        sameSite: 'lax'
      });
      
      return cookieResponse;
    } else {
      // If backend request fails, try to update attributes directly
      try {
        // Create a simple API call to the update-attributes endpoint
        const attributeResponse = await fetch('/api/user/update-attributes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.accessToken}`
          },
          body: JSON.stringify({
            attributes: {
              'custom:onboarding': 'complete',
              'custom:setupdone': 'true',
              'custom:acctstatus': 'ACTIVE',
              'custom:updated_at': new Date().toISOString()
            },
            forceUpdate: true
          })
        });
        
        if (attributeResponse.ok) {
          logger.info('[API] Onboarding completed via attributes update');
          
          // Also update the user's cookies
          const cookieResponse = NextResponse.json({
            success: true,
            message: 'Onboarding completed via attributes update'
          });
          
          // Set cookies to reflect the updated onboarding status
          cookieResponse.cookies.set('onboardingStep', 'COMPLETE', {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            httpOnly: false,
            sameSite: 'lax'
          });
          
          cookieResponse.cookies.set('onboardedStatus', 'COMPLETE', {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            httpOnly: false,
            sameSite: 'lax'
          });
          
          cookieResponse.cookies.set('setupCompleted', 'true', {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            httpOnly: false,
            sameSite: 'lax'
          });
          
          return cookieResponse;
        } else {
          throw new Error('Failed to update attributes directly');
        }
      } catch (attributeError) {
        logger.error('[API] Error in attribute update fallback:', attributeError);
        
        return NextResponse.json(
          { 
            error: 'Failed to complete onboarding', 
            message: 'Both backend and direct update methods failed' 
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    logger.error('[API] Error in onboarding/complete endpoint:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();

    const accessToken = tokens.accessToken.toString();
    const idToken = tokens.idToken.toString();
    const userId = user.userId;

    // Get user attributes
    const attributes = user.attributes || {};
    const onboardingStatus = (attributes['custom:onboarding'] || 'NOT_STARTED').toLowerCase();
    // Normalize setupDone to handle both 'TRUE' and 'true' values
    const setupDone = (attributes['custom:setupdone'] || '').toLowerCase() === 'true';

    return NextResponse.json({
      success: true,
      isComplete: onboardingStatus === 'complete' && setupDone,
      currentStatus: onboardingStatus,
      setupDone
    });
  } catch (error) {
    logger.error('[Complete] Error checking completion status:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check completion status',
      },
      { status: 500 }
    );
  }
}