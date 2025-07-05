import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email required in request body' }, { status: 400 });
    }
    
    console.log(`[FIX-ONBOARDING] Attempting to fix onboarding status for: ${email}`);
    
    // Get session for auth token
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session');
    
    let accessToken = null;
    if (sessionCookie) {
      try {
        const { decrypt } = await import('@/utils/sessionEncryption');
        const decrypted = decrypt(sessionCookie.value);
        const sessionData = JSON.parse(decrypted);
        accessToken = sessionData.accessToken;
      } catch (e) {
        console.error('[FIX-ONBOARDING] Error decrypting session:', e);
      }
    }
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No valid session found' }, { status: 401 });
    }
    
    // Only allow admin users to fix onboarding
    // For now, we'll allow if the user is authenticated
    // In production, add proper admin checks
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    // Call backend endpoint to fix onboarding status
    const response = await fetch(`${apiUrl}/api/onboarding/admin-fix-status/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        action: 'mark_complete'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json({ 
        error: 'Failed to fix onboarding status',
        details: errorData 
      }, { status: response.status });
    }
    
    const result = await response.json();
    
    // Clear the user's session cache to force refresh
    try {
      const clearCacheResponse = await fetch('/api/auth/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (clearCacheResponse.ok) {
        console.log('[FIX-ONBOARDING] Cache cleared for user');
      }
    } catch (e) {
      console.error('[FIX-ONBOARDING] Error clearing cache:', e);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Onboarding status fixed',
      result,
      next_steps: [
        'User should log out and log back in',
        'Session will be updated with correct status',
        'User should be redirected to dashboard instead of onboarding'
      ]
    });
    
  } catch (error) {
    console.error('[FIX-ONBOARDING] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}