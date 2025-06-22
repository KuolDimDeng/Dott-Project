import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * PERMANENT FIX: Profile API using Unified Profile Endpoint
 * 
 * This is the permanent solution that uses business logic to resolve
 * onboarding status conflicts. No more undefined values or inconsistencies.
 */
export async function GET(request) {
  console.log('[Profile API] PERMANENT FIX - Using unified profile endpoint');
  
  try {
    const cookieStore = await cookies();
    
    // Check for session cookies (new v2 system)
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    console.log('[Profile API] Session cookies:', {
      hasSid: !!sidCookie,
      hasSessionToken: !!sessionTokenCookie
    });
    
    // PERMANENT FIX: Use unified profile endpoint that applies business logic
    if (sidCookie || sessionTokenCookie) {
      console.log('[Profile API] Using unified profile endpoint for permanent fix');
      
      try {
        // Call session-v2 endpoint directly for complete user data
        // Use absolute URL to avoid SSL issues
        const baseUrl = process.env.NEXTAUTH_URL || 'https://dottapps.com';
        const sessionResponse = await fetch(`${baseUrl}/api/auth/session-v2`, {
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          },
          cache: 'no-store'
        });
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          console.log('[Profile API] Session data received:', {
            authenticated: sessionData.authenticated,
            hasUser: !!sessionData.user,
            email: sessionData.user?.email,
            businessName: sessionData.user?.businessName,
            subscriptionPlan: sessionData.user?.subscriptionPlan
          });
          
          // If authenticated, return the user data
          if (sessionData.authenticated && sessionData.user) {
            return NextResponse.json({
              ...sessionData.user,
              authenticated: true,
              sessionSource: 'session-v2'
            }, {
              headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
          }
        } else {
          console.error('[Profile API] Session endpoint failed:', sessionResponse.status);
        }
      } catch (error) {
        console.error('[Profile API] Error calling session endpoint:', error);
      }
      
      // If session-v2 fails, return minimal response
      return NextResponse.json({
        authenticated: false,
        error: 'Session not found'
      }, { status: 401 });
    }
    
    // Check for authorization header as fallback
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('[Profile API] Found authorization header, using token');
      
      try {
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        console.log('[Profile API] Decoded token payload:', {
          sub: payload.sub,
          email: payload.email
        });
        
        // Return basic profile data based on token
        // Backend will determine onboarding status when they authenticate properly
        return NextResponse.json({
          authenticated: true,
          source: 'authorization-header',
          email: payload.email,
          sub: payload.sub,
          needsOnboarding: true, // Default to true, backend will correct this
          onboardingCompleted: false,
          currentStep: 'business_info'
        }, { status: 200 });
      } catch (decodeError) {
        console.error('[Profile API] Error decoding token:', decodeError);
      }
    }
    
    console.log('[Profile API] No valid session found');
    return NextResponse.json(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}