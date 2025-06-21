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
        // Call our own unified profile endpoint
        const unifiedResponse = await fetch(`${request.url.replace('/profile', '/unified-profile')}`, {
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          },
          cache: 'no-store'
        });
        
        if (unifiedResponse.ok) {
          const unifiedData = await unifiedResponse.json();
          console.log('[Profile API] PERMANENT FIX - Unified data received:', {
            needsOnboarding: unifiedData.needsOnboarding,
            onboardingCompleted: unifiedData.onboardingCompleted,
            tenantId: unifiedData.tenantId,
            businessRule: unifiedData.businessRule
          });
          
          // Return the authoritative response
          return NextResponse.json(unifiedData, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        } else {
          console.error('[Profile API] Unified endpoint failed:', unifiedResponse.status);
          throw new Error('Unified profile endpoint failed');
        }
      } catch (error) {
        console.error('[Profile API] Error calling unified endpoint:', error);
        // Return error instead of inconsistent fallback
        return NextResponse.json({
          authenticated: false,
          error: 'Profile service unavailable',
          message: error.message
        }, { status: 500 });
      }
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