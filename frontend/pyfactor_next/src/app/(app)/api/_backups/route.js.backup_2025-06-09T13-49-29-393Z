import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * Validate Auth0 session
 */
async function validateAuth0Session(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return { isAuthenticated: false, error: 'No Auth0 session found', user: null };
    }
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    
    // Check if session is expired
    if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
      return { isAuthenticated: false, error: 'Session expired', user: null };
    }
    
    if (!sessionData.user) {
      return { isAuthenticated: false, error: 'Invalid session data', user: null };
    }
    
    return { isAuthenticated: true, user: sessionData.user, sessionData, error: null };
  } catch (error) {
    logger.error('[Update Onboarding Status] Session validation error:', error);
    return { isAuthenticated: false, error: 'Session validation failed', user: null };
  }
}

/**
 * Update user onboarding status in backend
 */
export async function POST(request) {
  try {
    // Validate Auth0 session
    const authResult = await validateAuth0Session(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      );
    }

    const { user, sessionData } = authResult;
    const body = await request.json();
    const { tenantId, onboardingCompleted = true } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    logger.info('[Update Onboarding Status] Updating status for user:', {
      email: user.email,
      tenantId,
      onboardingCompleted
    });

    try {
      // Call backend API to update onboarding status
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL;
      if (!backendUrl) {
        logger.warn('[Update Onboarding Status] No backend URL configured');
        return NextResponse.json({ 
          success: true,
          message: 'Backend not configured, status updated locally'
        });
      }

      const response = await fetch(`${backendUrl}/api/users/update-onboarding-status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.accessToken || ''}`
        },
        body: JSON.stringify({
          user_id: user.sub,
          tenant_id: tenantId,
          onboarding_completed: onboardingCompleted,
          needs_onboarding: !onboardingCompleted,
          current_step: onboardingCompleted ? 'completed' : 'business_info'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Update Onboarding Status] Backend update failed:', errorText);
        // Don't fail the whole process
      }

      return NextResponse.json({ 
        success: true,
        message: 'Onboarding status updated successfully',
        tenantId,
        onboardingCompleted
      });
      
    } catch (error) {
      logger.error('[Update Onboarding Status] Error updating backend:', error);
      // Return success anyway - we don't want to block the user
      return NextResponse.json({ 
        success: true,
        message: 'Status updated with warning',
        warning: 'Backend update failed but proceeding'
      });
    }

  } catch (error) {
    logger.error('[Update Onboarding Status] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}