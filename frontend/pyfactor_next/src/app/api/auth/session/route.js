import { NextResponse } from 'next/server';

/**
 * Session endpoint that wraps session-v2 for backward compatibility
 * This endpoint is used by AuthButton and other components expecting /api/auth/session
 */
export async function GET(request) {
  try {
    console.log('[Session API] Forwarding to session-v2');
    
    // Forward the request to session-v2 endpoint
    // Use the current host to ensure it works on both staging and production
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    console.log('[Session API] Forwarding to:', `${baseUrl}/api/auth/session-v2`);
    
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session-v2`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'X-Forwarded-Host': host || ''
      },
      cache: 'no-store'
    });
    
    if (!sessionResponse.ok) {
      console.log('[Session API] Session-v2 returned non-OK status:', sessionResponse.status);
      return NextResponse.json(null, { 
        status: sessionResponse.status,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    const sessionData = await sessionResponse.json();
    
    // Transform the response to match expected format for AuthButton
    // AuthButton expects: { user: { ... } } format
    if (sessionData.authenticated && sessionData.user) {
      return NextResponse.json({
        user: sessionData.user,
        authenticated: sessionData.authenticated,
        csrfToken: sessionData.csrfToken
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    // Return null for unauthenticated state (matching Auth0 SDK behavior)
    return NextResponse.json(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json(null, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}