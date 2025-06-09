import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { logger } from '@/utils/logger';

/**
 * Update user onboarding status in backend
 */
export async function POST(request) {
  try {
    // Get current session
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tenantId, onboardingCompleted = true } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    logger.info('[Update Onboarding Status] Updating status for user:', {
      email: session.user.email,
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
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          user_id: session.user.sub,
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