import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Account closure endpoint
 * Handles closing user account with proper cleanup
 */
export async function POST(request) {
  try {
    // Get session from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const { user, accessToken } = sessionData;
    
    if (!user || !accessToken) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { reason, feedback } = body;
    
    console.log('[CloseAccount] Processing account closure for:', user.email);
    
    // Call backend to close account
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
    
    const response = await fetch(`${apiBaseUrl}/api/auth0/close-account/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason,
        feedback,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CloseAccount] Backend error:', errorText);
      return NextResponse.json({ 
        error: 'Failed to close account',
        details: errorText 
      }, { status: response.status });
    }
    
    const result = await response.json();
    
    console.log('[CloseAccount] Account closed successfully:', result);
    
    // Delete Auth0 user (optional - depends on your Auth0 setup)
    try {
      // Get Auth0 Management API token
      const tokenResponse = await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: process.env.AUTH0_CLIENT_ID,
          client_secret: process.env.AUTH0_CLIENT_SECRET,
          audience: `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/api/v2/`
        })
      });
      
      if (tokenResponse.ok) {
        const { access_token } = await tokenResponse.json();
        
        // Delete user from Auth0
        await fetch(`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(user.sub)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        });
        
        console.log('[CloseAccount] User deleted from Auth0');
      }
    } catch (auth0Error) {
      console.error('[CloseAccount] Error deleting from Auth0:', auth0Error);
      // Continue anyway - backend deletion is more important
    }
    
    // Clear all cookies
    const response = NextResponse.json({
      success: true,
      message: 'Account closed successfully',
      deletion_id: result.deletion_id
    });
    
    // Clear all auth cookies
    response.cookies.delete('appSession');
    response.cookies.delete('auth0.is.authenticated');
    response.cookies.delete('auth0-session');
    response.cookies.delete('user_tenant_id');
    response.cookies.delete('tenantId');
    
    return response;
    
  } catch (error) {
    console.error('[CloseAccount] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}