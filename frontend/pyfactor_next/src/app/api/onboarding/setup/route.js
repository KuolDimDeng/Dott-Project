import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';
import { cookies } from 'next/headers';
import { updateOnboardingStep } from '@/utils/onboardingUtils';

export async function POST(request) {
  // Generate unique request ID for tracing
  const requestId = crypto.randomUUID();
  
  try {
    logger.debug('[Setup] Handling setup request', { requestId });
    
    // Add cache-busting to prevent stale responses
    const url = new URL(request.url);
    const cacheParam = url.searchParams.get('ts') || Date.now();
    
    // Get tokens from request headers and cookies as fallback
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '') || 
                         request.cookies.get('accessToken')?.value;
    const idToken = request.headers.get('X-Id-Token') || 
                      request.cookies.get('idToken')?.value;
    
    // Check if we have valid tokens
    if (!accessToken || !idToken) {
      logger.error('[Setup] No auth tokens in request headers or cookies', { requestId });
      
      // Check if we have any fallback authentication - use await with cookies()
      const cookieStore = cookies();
      const allCookies = await cookieStore.getAll();
      const hasCookies = allCookies.some(cookie => 
        cookie.name === 'userId' || cookie.name === 'hasUser'
      );
      
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          status: 'auth_error',
          needsRefresh: true,
          hasFallbackCookies: hasCookies,
          requestId
        },
        { status: 401 }
      );
    }

    // First update the onboarding step to indicate we're in the setup phase
    try {
      // If we're starting setup, update the onboarding step to SETUP
      await updateOnboardingStep('SETUP', {
        'setupstarted': 'TRUE',
        'setup_started_at': new Date().toISOString()
      });
      
      logger.debug('[Setup] Updated onboarding step to SETUP', { requestId });
    } catch (updateError) {
      logger.warn('[Setup] Failed to update onboarding step:', { 
        requestId,
        error: updateError.message
      });
      // Continue even if update fails - we'll retry later
    }
    
    // Store important information in cookies for recovery
    const cookieOptions = {
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
      httpOnly: false // Allow JS to read
    };
    
    // Get request body if available
    let requestBody = {};
    try {
      requestBody = await request.json();
    } catch (parseError) {
      logger.warn('[Setup] Failed to parse request body:', {
        requestId,
        error: parseError.message
      });
    }
    
    // Setup options from request body
    const setupOptions = requestBody.setup_options || {};
    const freePlan = setupOptions.free_plan === true;
    const allowPartial = setupOptions.allow_partial === true;
    const restoreProgress = setupOptions.restore_progress === true;
    const lastProgress = setupOptions.last_progress || 0;
    
    // Prepare the response
    const jsonResponse = NextResponse.json({
      status: 'started',
      message: 'Setup process initiated',
      timestamp: new Date().toISOString(),
      requestId,
      freePlan,
      allowPartial
    });
    
    // Set cookies for recovery scenarios
    jsonResponse.cookies.set('setupStarted', 'true', cookieOptions);
    jsonResponse.cookies.set('onboardingStep', 'setup', cookieOptions);
    jsonResponse.cookies.set('onboardingStatus', 'SETUP', cookieOptions);
    jsonResponse.cookies.set('setupOptions', JSON.stringify({
      freePlan,
      allowPartial,
      startedAt: new Date().toISOString()
    }), cookieOptions);
    
    // Set initial progress if restoring
    if (restoreProgress && lastProgress > 0) {
      jsonResponse.cookies.set('setupProgress', String(Math.min(lastProgress, 95)), cookieOptions);
    } else {
      jsonResponse.cookies.set('setupProgress', '5', cookieOptions); // Start at 5%
    }
    
    return jsonResponse;
  } catch (error) {
    logger.error('[Setup] Error processing request', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: 'Setup process failed',
        message: 'An unexpected error occurred during setup',
        details: error.message,
        requestId,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}