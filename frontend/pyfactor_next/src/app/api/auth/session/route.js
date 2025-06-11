import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * Custom session endpoint to ensure properly formatted JSON responses
 * This endpoint is called by the Next Auth client library
 * Falls back to Cognito when NextAuth fails
 */
export async function GET(request) {
  try {
    console.log('[Auth Session] Getting Auth0 session data');
    
    // Try to get session from custom cookie first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.log('[Auth Session] No session cookie found');
      return NextResponse.json(null, { status: 200 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      console.error('[Auth Session] Error parsing session cookie:', parseError);
      return NextResponse.json(null, { status: 200 });
    }
    
    // Check if session is expired
    if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
      console.log('[Auth Session] Session expired');
      return NextResponse.json(null, { status: 200 });
    }
    
    const { user, accessToken, idToken } = sessionData;
    
    if (!user) {
      console.log('[Auth Session] No user in session data');
      return NextResponse.json(null, { status: 200 });
    }
    
    console.log('[Auth Session] Session found for user:', user.email);
    
    // Return session data in the format expected by the callback
    return NextResponse.json({
      user: user,
      accessToken: accessToken,
      idToken: idToken,
      authenticated: true,
      source: 'session-cookie'
    });
    
  } catch (error) {
    console.error('[Auth Session] Error getting session:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}

/**
 * Create a new session from Auth0 tokens
 * Used by the EmailPasswordSignIn component after successful authentication
 */
export async function POST(request) {
  const debugLog = [];
  
  const addDebugEntry = (message, data = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      ...data
    };
    debugLog.push(entry);
    logger.info(`[Auth Session POST] ${message}`, data);
  };
  
  try {
    addDebugEntry('Creating new session from tokens');
    
    const body = await request.json();
    const { accessToken, idToken, user } = body;
    
    addDebugEntry('Request body received', {
      hasAccessToken: !!accessToken,
      hasIdToken: !!idToken,
      hasUser: !!user,
      userEmail: user?.email
    });
    
    if (!accessToken || !user) {
      addDebugEntry('Missing required session data');
      return NextResponse.json(
        { 
          error: 'Missing required session data',
          debugLog 
        },
        { status: 400 }
      );
    }
    
    // Check onboarding status
    let needsOnboarding = true;
    let tenantId = null;
    let businessName = null;
    
    // Check various metadata locations for onboarding status
    const userMetadata = user['https://dottapps.com/user_metadata'] || {};
    const appMetadata = user['https://dottapps.com/app_metadata'] || {};
    
    // Check for onboarding completion
    const onboardingComplete = 
      userMetadata.onboardingCompleted === 'true' ||  // Check the correct field name
      userMetadata.onboardingComplete === 'true' || 
      userMetadata.custom_onboardingComplete === 'true' ||
      userMetadata.custom_onboarding === 'complete' ||
      appMetadata.onboardingComplete === 'true' ||
      appMetadata.onboardingCompleted === 'true';
    
    if (onboardingComplete) {
      needsOnboarding = false;
    }
    
    // Extract tenant ID
    tenantId = userMetadata.tenantId || 
               userMetadata.custom_tenantId || 
               user.custom_tenantId ||
               user.tenantId || 
               null;
    
    // Extract business name
    businessName = userMetadata.businessName ||
                   userMetadata.custom_businessName ||
                   user.businessName ||
                   null;
    
    addDebugEntry('Onboarding status checked', {
      needsOnboarding,
      onboardingComplete,
      tenantId,
      businessName
    });
    
    // Create session data - ensure consistent token field names
    const sessionData = {
      user: {
        ...user,
        needsOnboarding,
        onboardingCompleted: !needsOnboarding,
        tenantId,
        businessName
      },
      accessToken: accessToken,
      access_token: accessToken,  // Store both formats for compatibility
      idToken: idToken,
      id_token: idToken,  // Store both formats for compatibility
      accessTokenExpiresAt: Date.now() + (3600 * 1000) // Default 1 hour
    };
    
    // Encode session as base64
    const sessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    addDebugEntry('Session created', {
      userEmail: sessionData.user.email,
      needsOnboarding: sessionData.user.needsOnboarding,
      tenantId: sessionData.user.tenantId
    });
    
    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: sessionData.user,
      needsOnboarding,
      tenantId,
      debugLog
    });
    
    // Set session cookie
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Always use secure in production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days (match update-session)
      path: '/'
    };
    
    // Add domain in production to ensure cookie works across subdomains
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.domain = '.dottapps.com'; // Leading dot allows subdomains
    }
    
    response.cookies.set('appSession', sessionCookie, cookieOptions);
    
    addDebugEntry('Session cookie set', {
      cookieOptions: cookieOptions,
      sessionDataSize: sessionCookie.length,
      nodeEnv: process.env.NODE_ENV
    });
    
    return response;
    
  } catch (error) {
    addDebugEntry('Error creating session', {
      error: error.message,
      stack: error.stack
    });
    
    logger.error('[Auth Session POST] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create session',
        message: error.message,
        debugLog
      },
      { status: 500 }
    );
  }
} 