import { NextResponse } from 'next/server';
import { getAccessToken } from '@auth0/nextjs-auth0/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  console.log('[TEST_CLOSE_ACCOUNT] Testing close account flow...');
  
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        error: 'No session found',
        step: 'session_check'
      }, { status: 401 });
    }
    
    let session;
    try {
      session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid session',
        step: 'session_parse'
      }, { status: 401 });
    }
    
    console.log('[TEST_CLOSE_ACCOUNT] Session found for:', session.user?.email);
    
    // Test getting access token
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
        console.log('[TEST_CLOSE_ACCOUNT] Got access token, length:', accessToken.length);
      } else {
        tokenError = 'No access token in response';
      }
    } catch (error) {
      tokenError = error.message;
      console.error('[TEST_CLOSE_ACCOUNT] Token error:', error);
    }
    
    // Test backend API call if we have a token
    let backendTest = { attempted: false };
    
    if (accessToken) {
      console.log('[TEST_CLOSE_ACCOUNT] Testing backend close account endpoint...');
      
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
        const testResponse = await fetch(`${backendUrl}/api/users/close-account/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-User-Email': session.user.email,
            'X-User-Sub': session.user.sub
          },
          body: JSON.stringify({
            reason: 'test',
            feedback: 'Testing from test endpoint',
            user_email: session.user.email,
            user_sub: session.user.sub
          })
        });
        
        const responseText = await testResponse.text();
        let responseData;
        
        try {
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          responseData = { error: 'Invalid JSON response', raw: responseText };
        }
        
        backendTest = {
          attempted: true,
          status: testResponse.status,
          ok: testResponse.ok,
          statusText: testResponse.statusText,
          headers: Object.fromEntries(testResponse.headers.entries()),
          data: responseData
        };
        
        console.log('[TEST_CLOSE_ACCOUNT] Backend response status:', testResponse.status);
        
      } catch (error) {
        backendTest = {
          attempted: true,
          error: error.message,
          errorType: error.constructor.name
        };
      }
    }
    
    // Decode token payload if available
    let tokenPayload = null;
    if (accessToken) {
      try {
        const parts = accessToken.split('.');
        if (parts.length >= 2) {
          tokenPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        }
      } catch (e) {
        console.error('[TEST_CLOSE_ACCOUNT] Failed to decode token:', e);
      }
    }
    
    return NextResponse.json({
      success: true,
      session: {
        userEmail: session.user?.email,
        userSub: session.user?.sub,
        hasAccessToken: !!session.accessToken,
        hasIdToken: !!session.idToken
      },
      accessToken: {
        retrieved: !!accessToken,
        length: accessToken ? accessToken.length : 0,
        error: tokenError,
        payload: tokenPayload ? {
          aud: tokenPayload.aud,
          iss: tokenPayload.iss,
          scope: tokenPayload.scope,
          sub: tokenPayload.sub,
          exp: tokenPayload.exp
        } : null
      },
      backendTest,
      config: {
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
        backendUrl: process.env.NEXT_PUBLIC_API_URL
      }
    });
    
  } catch (error) {
    console.error('[TEST_CLOSE_ACCOUNT] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}