import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Simplified Close Account API Route
 * Focuses only on backend deletion, skips Auth0 Management API
 */
export async function POST(request) {
  console.log('[CLOSE_ACCOUNT_SIMPLE] Starting account closure process');
  
  try {
    // 1. Get session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.error('[CLOSE_ACCOUNT_SIMPLE] No session cookie found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // 2. Parse session
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      console.error('[CLOSE_ACCOUNT_SIMPLE] Failed to parse session:', error);
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const user = sessionData.user;
    const accessToken = sessionData.accessToken || sessionData.access_token;
    
    if (!user || !accessToken) {
      console.error('[CLOSE_ACCOUNT_SIMPLE] Missing user or token in session');
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
    }
    
    console.log('[CLOSE_ACCOUNT_SIMPLE] User authenticated:', user.email);
    
    // 3. Get request data
    const { reason, feedback } = await request.json();
    
    // 4. Call backend to close account
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    console.log('[CLOSE_ACCOUNT_SIMPLE] Calling backend:', `${backendUrl}/api/users/close-account/`);
    
    const backendResponse = await fetch(`${backendUrl}/api/users/close-account/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Email': user.email,
        'X-User-Sub': user.sub
      },
      body: JSON.stringify({
        reason,
        feedback,
        user_email: user.email,
        user_sub: user.sub
      })
    });
    
    const responseText = await backendResponse.text();
    let backendResult;
    
    try {
      backendResult = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.error('[CLOSE_ACCOUNT_SIMPLE] Failed to parse backend response:', responseText);
      backendResult = { error: 'Invalid response from backend' };
    }
    
    console.log('[CLOSE_ACCOUNT_SIMPLE] Backend response:', {
      status: backendResponse.status,
      ok: backendResponse.ok,
      result: backendResult
    });
    
    if (!backendResponse.ok) {
      // If 403, it might be an authentication issue
      if (backendResponse.status === 403) {
        console.error('[CLOSE_ACCOUNT_SIMPLE] Authentication failed - token might be invalid');
        return NextResponse.json({ 
          error: 'Authentication failed',
          message: 'Your session has expired. Please sign out and sign in again.',
          requiresReauth: true
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: backendResult.error || 'Failed to close account',
        message: backendResult.message || backendResult.detail || 'Please contact support.'
      }, { status: backendResponse.status });
    }
    
    // 5. Success - prepare response and clear cookies
    console.log('[CLOSE_ACCOUNT_SIMPLE] Account closed successfully');
    
    const response = NextResponse.json({
      success: true,
      message: 'Your account has been closed successfully.',
      details: backendResult.details || {
        account_closed: true,
        timestamp: new Date().toISOString()
      }
    });
    
    // Clear all auth-related cookies
    const cookiesToClear = [
      'appSession',
      'auth0.is.authenticated',
      'auth0-session',
      'user_tenant_id',
      'onboardingCompleted',
      'tenantId'
    ];
    
    cookiesToClear.forEach(cookieName => {
      response.cookies.delete(cookieName);
    });
    
    return response;
    
  } catch (error) {
    console.error('[CLOSE_ACCOUNT_SIMPLE] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to close account',
      message: error.message
    }, { status: 500 });
  }
}