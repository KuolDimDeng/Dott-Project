import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getAccessToken } from '@auth0/nextjs-auth0';

export async function GET(request) {
  try {
    console.log('[TEST_AUTH] Testing Auth0 authentication...');
    
    // Get session
    const session = await getSession(request);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'No session found',
        authenticated: false 
      }, { status: 401 });
    }
    
    console.log('[TEST_AUTH] Session found:', {
      user: session.user?.email,
      sub: session.user?.sub,
      hasAccessToken: !!session.accessToken,
      hasIdToken: !!session.idToken
    });
    
    // Try to get access token
    let accessToken = null;
    let tokenError = null;
    
    try {
      const tokenResponse = await getAccessToken(request, {
        authorizationParams: {
          audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
          scope: 'openid profile email'
        }
      });
      
      if (tokenResponse && tokenResponse.accessToken) {
        accessToken = tokenResponse.accessToken;
        console.log('[TEST_AUTH] Access token retrieved successfully');
      }
    } catch (error) {
      tokenError = error.message;
      console.error('[TEST_AUTH] Error getting access token:', error);
    }
    
    // Test backend call if we have a token
    let backendTest = null;
    if (accessToken) {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
        const response = await fetch(`${backendUrl}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.text();
        backendTest = {
          status: response.status,
          ok: response.ok,
          data: data ? (data.startsWith('{') ? JSON.parse(data) : data) : null
        };
      } catch (error) {
        backendTest = {
          error: error.message
        };
      }
    }
    
    return NextResponse.json({
      authenticated: true,
      session: {
        user: {
          email: session.user?.email,
          sub: session.user?.sub,
          name: session.user?.name
        },
        hasAccessToken: !!session.accessToken,
        hasIdToken: !!session.idToken
      },
      accessToken: {
        retrieved: !!accessToken,
        length: accessToken ? accessToken.length : 0,
        preview: accessToken ? accessToken.substring(0, 50) + '...' : null,
        error: tokenError
      },
      backendTest,
      debug: {
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
        domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
        clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID
      }
    });
    
  } catch (error) {
    console.error('[TEST_AUTH] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}