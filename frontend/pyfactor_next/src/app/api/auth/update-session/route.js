import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * Update the current session with new data
 * Used to update tenant ID and onboarding status after authentication
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId, needsOnboarding, onboardingCompleted } = body;
    
    logger.info('[UpdateSession] Updating session data', {
      tenantId,
      needsOnboarding,
      onboardingCompleted
    });
    
    // Get current session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      logger.error('[UpdateSession] No session cookie found');
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      logger.error('[UpdateSession] Error parsing session cookie:', parseError);
      return NextResponse.json(
        { error: 'Invalid session data' },
        { status: 400 }
      );
    }
    
    // Update session data
    if (tenantId !== undefined) {
      sessionData.user.tenantId = tenantId;
    }
    
    if (needsOnboarding !== undefined) {
      sessionData.user.needsOnboarding = needsOnboarding;
    }
    
    if (onboardingCompleted !== undefined) {
      sessionData.user.onboardingCompleted = onboardingCompleted;
    }
    
    // Re-encode session
    const updatedSessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Session updated successfully'
    });
    
    // Set updated session cookie
    response.cookies.set('appSession', updatedSessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/'
    });
    
    logger.info('[UpdateSession] Session updated successfully');
    
    return response;
    
  } catch (error) {
    logger.error('[UpdateSession] Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}