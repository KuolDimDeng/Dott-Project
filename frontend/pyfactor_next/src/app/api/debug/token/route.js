import { NextResponse } from 'next/server';
import { getAccessToken } from '@auth0/nextjs-auth0/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('[TOKEN_DEBUG] Testing Auth0 token generation...');
    
    // Get session from cookies
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        error: 'No session found',
        authenticated: false 
      }, { status: 401 });
    }
    
    let session;
    try {
      session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid session',
        authenticated: false 
      }, { status: 401 });
    }
    
    console.log('[TOKEN_DEBUG] Session found for:', session.user?.email);
    
    // Try to get access token with explicit audience
    let tokenResults = {};
    
    // Test different approaches to get the token
    const approaches = [
      {
        name: 'Default getAccessToken',
        config: undefined
      },
      {
        name: 'With explicit audience',
        config: {
          authorizationParams: {
            audience: 'https://api.dottapps.com',
            scope: 'openid profile email'
          }
        }
      },
      {
        name: 'With backend audience',
        config: {
          authorizationParams: {
            audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
            scope: 'openid profile email offline_access'
          }
        }
      }
    ];
    
    for (const approach of approaches) {
      try {
        console.log(`[TOKEN_DEBUG] Trying: ${approach.name}`);
        
        const tokenResponse = approach.config 
          ? await getAccessToken(request, approach.config)
          : await getAccessToken(request);
        
        if (tokenResponse && tokenResponse.accessToken) {
          tokenResults[approach.name] = {
            success: true,
            tokenLength: tokenResponse.accessToken.length,
            tokenPreview: tokenResponse.accessToken.substring(0, 50) + '...',
            hasToken: true
          };
          
          // Decode the token to check audience
          try {
            const tokenParts = tokenResponse.accessToken.split('.');
            if (tokenParts.length >= 2) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
              tokenResults[approach.name].tokenPayload = {
                aud: payload.aud,
                iss: payload.iss,
                scope: payload.scope,
                sub: payload.sub,
                exp: payload.exp
              };
            }
          } catch (decodeError) {
            tokenResults[approach.name].decodeError = decodeError.message;
          }
        } else {
          tokenResults[approach.name] = {
            success: false,
            error: 'No access token returned'
          };
        }
      } catch (error) {
        tokenResults[approach.name] = {
          success: false,
          error: error.message,
          errorType: error.constructor.name
        };
      }
    }
    
    // Test backend endpoint with the best token
    let backendTest = null;
    const bestToken = Object.values(tokenResults).find(result => result.success && result.hasToken);
    
    if (bestToken) {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
        const response = await fetch(`${backendUrl}/api/users/me/`, {
          headers: {
            'Authorization': `Bearer ${Object.values(tokenResults).find(r => r.success)?.tokenPreview?.replace('...', '')}`, // This won't work, just for demo
            'Content-Type': 'application/json'
          }
        });
        
        backendTest = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        };
        
        if (!response.ok) {
          const errorText = await response.text();
          backendTest.error = errorText;
        }
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
        }
      },
      tokenTests: tokenResults,
      backendTest,
      config: {
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
        clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
        backendUrl: process.env.NEXT_PUBLIC_API_URL
      }
    });
    
  } catch (error) {
    console.error('[TOKEN_DEBUG] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}