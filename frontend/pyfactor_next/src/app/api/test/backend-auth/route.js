import { NextResponse } from 'next/server';
import { getAccessToken } from '@auth0/nextjs-auth0';
import { cookies } from 'next/headers';

export async function GET(request) {
  console.log('[TEST_BACKEND_AUTH] Testing backend authentication...');
  
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        error: 'No session found'
      }, { status: 401 });
    }
    
    let session;
    try {
      session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid session'
      }, { status: 401 });
    }
    
    // Get access token
    let accessToken = null;
    
    try {
      const tokenResponse = await getAccessToken(request, {
        authorizationParams: {
          audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
          scope: 'openid profile email'
        }
      });
      
      if (tokenResponse && tokenResponse.accessToken) {
        accessToken = tokenResponse.accessToken;
      }
    } catch (error) {
      console.error('[TEST_BACKEND_AUTH] Token error:', error);
    }
    
    // Test multiple backend endpoints
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const endpoints = [
      '/api/auth/profile',
      '/api/users/close-account/',
      '/api/auth/session-v2'
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        console.log(`[TEST_BACKEND_AUTH] Testing ${endpoint}...`);
        
        const testUrl = `${backendUrl}${endpoint}`;
        const method = endpoint.includes('close-account') ? 'POST' : 'GET';
        
        const fetchOptions = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-User-Email': session.user?.email,
            'X-User-Sub': session.user?.sub
          }
        };
        
        if (method === 'POST') {
          fetchOptions.body = JSON.stringify({
            reason: 'test',
            feedback: 'Authentication test'
          });
        }
        
        const response = await fetch(testUrl, fetchOptions);
        const responseText = await response.text();
        
        let responseData;
        try {
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          responseData = { raw: responseText };
        }
        
        results[endpoint] = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries())
        };
        
      } catch (error) {
        results[endpoint] = {
          error: error.message
        };
      }
    }
    
    // Decode token
    let tokenInfo = null;
    if (accessToken) {
      try {
        const parts = accessToken.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          tokenInfo = {
            aud: payload.aud,
            iss: payload.iss,
            scope: payload.scope,
            sub: payload.sub,
            exp: payload.exp,
            iat: payload.iat
          };
        }
      } catch (e) {
        tokenInfo = { error: 'Failed to decode token' };
      }
    }
    
    return NextResponse.json({
      success: true,
      user: {
        email: session.user?.email,
        sub: session.user?.sub
      },
      token: {
        hasToken: !!accessToken,
        length: accessToken ? accessToken.length : 0,
        preview: accessToken ? accessToken.substring(0, 50) + '...' : null,
        payload: tokenInfo
      },
      backendTests: results,
      config: {
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
        backendUrl: process.env.NEXT_PUBLIC_API_URL
      }
    });
    
  } catch (error) {
    console.error('[TEST_BACKEND_AUTH] Error:', error);
    return NextResponse.json({ 
      error: error.message
    }, { status: 500 });
  }
}