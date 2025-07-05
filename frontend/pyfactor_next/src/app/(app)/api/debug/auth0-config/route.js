import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('[AUTH0_CONFIG_DEBUG] Checking Auth0 configuration and session...');
    
    // Get session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        error: 'No session cookie found'
      }, { status: 401 });
    }
    
    // Parse session
    let session;
    try {
      session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      return NextResponse.json({ 
        error: 'Failed to parse session',
        details: error.message
      }, { status: 401 });
    }
    
    // Check what's in the session
    const sessionInfo = {
      hasUser: !!session.user,
      userEmail: session.user?.email,
      userSub: session.user?.sub,
      sessionKeys: Object.keys(session),
      hasAccessToken: !!session.accessToken,
      hasIdToken: !!session.idToken,
      hasRefreshToken: !!session.refreshToken,
      tokenTypes: {
        accessToken: session.accessToken ? typeof session.accessToken : 'not present',
        idToken: session.idToken ? typeof session.idToken : 'not present',
        refreshToken: session.refreshToken ? typeof session.refreshToken : 'not present'
      }
    };
    
    // Check Auth0 configuration
    const auth0Config = {
      domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
      clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET ? 'Set (hidden)' : 'Not set',
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      baseURL: process.env.NEXT_PUBLIC_BASE_URL,
      issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
      secret: process.env.AUTH0_SECRET ? 'Set (hidden)' : 'Not set'
    };
    
    // Try different methods to get tokens
    const tokenAttempts = {};
    
    // Method 1: Direct from session
    if (session.accessToken) {
      tokenAttempts.directFromSession = {
        success: true,
        tokenLength: session.accessToken.length,
        tokenPreview: session.accessToken.substring(0, 50) + '...'
      };
    } else {
      tokenAttempts.directFromSession = { success: false, reason: 'No accessToken in session' };
    }
    
    // Method 2: Try importing Auth0 SDK
    try {
      const { getAccessToken } = await import('@auth0/nextjs-auth0/server');
      
      // Try without parameters
      try {
        const result1 = await getAccessToken(request);
        tokenAttempts.sdkDefault = {
          success: !!result1?.accessToken,
          tokenLength: result1?.accessToken?.length || 0,
          error: result1?.error
        };
      } catch (e) {
        tokenAttempts.sdkDefault = { success: false, error: e.message };
      }
      
      // Try with explicit audience
      try {
        const result2 = await getAccessToken(request, {
          authorizationParams: {
            audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
            scope: 'openid profile email'
          }
        });
        tokenAttempts.sdkWithAudience = {
          success: !!result2?.accessToken,
          tokenLength: result2?.accessToken?.length || 0,
          error: result2?.error
        };
      } catch (e) {
        tokenAttempts.sdkWithAudience = { success: false, error: e.message };
      }
      
      // Try with refresh
      try {
        const result3 = await getAccessToken(request, {
          refresh: true,
          authorizationParams: {
            audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
            scope: 'openid profile email offline_access'
          }
        });
        tokenAttempts.sdkWithRefresh = {
          success: !!result3?.accessToken,
          tokenLength: result3?.accessToken?.length || 0,
          error: result3?.error
        };
      } catch (e) {
        tokenAttempts.sdkWithRefresh = { success: false, error: e.message };
      }
      
    } catch (error) {
      tokenAttempts.sdkImport = { success: false, error: error.message };
    }
    
    // Check if tokens exist but might be in different format
    const tokenSearch = {
      foundInSession: false,
      possibleLocations: []
    };
    
    // Search for token-like strings in session
    const searchSession = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string' && value.length > 100 && value.includes('.')) {
          // Might be a token
          const parts = value.split('.');
          if (parts.length === 3 || parts.length === 5) {
            tokenSearch.possibleLocations.push({
              path: currentPath,
              length: value.length,
              parts: parts.length,
              preview: value.substring(0, 30) + '...'
            });
            
            if (currentPath.toLowerCase().includes('access')) {
              tokenSearch.foundInSession = true;
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          searchSession(value, currentPath);
        }
      }
    };
    
    searchSession(session);
    
    return NextResponse.json({
      success: true,
      sessionInfo,
      auth0Config,
      tokenAttempts,
      tokenSearch,
      recommendations: {
        sessionHasTokens: sessionInfo.hasAccessToken || sessionInfo.hasIdToken,
        configComplete: !!(auth0Config.domain && auth0Config.clientId && auth0Config.audience),
        likelyIssue: !sessionInfo.hasAccessToken ? 
          'Session does not contain access tokens - user may need to re-authenticate with proper scope/audience' :
          'Session has tokens but SDK cannot retrieve them - configuration issue'
      }
    });
    
  } catch (error) {
    console.error('[AUTH0_CONFIG_DEBUG] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}