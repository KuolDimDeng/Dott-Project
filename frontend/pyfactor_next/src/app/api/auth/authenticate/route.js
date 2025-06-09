import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Direct Email/Password Authentication Endpoint
 * Handles authentication through Auth0's Resource Owner Password Grant
 * Uses custom domain for embedded login experience
 */
export async function POST(request) {
  const startTime = Date.now();
  const debugLog = [];
  
  const addDebugEntry = (step, data) => {
    const entry = {
      timestamp: new Date().toISOString(),
      elapsed: `${Date.now() - startTime}ms`,
      step,
      ...data
    };
    debugLog.push(entry);
    logger.info(`[Auth/Authenticate] ${step}`, data);
  };

  try {
    addDebugEntry('Starting authentication process', { method: 'POST' });
    
    // Parse request body
    const body = await request.json();
    const { email, password, connection = 'Username-Password-Authentication' } = body;
    
    addDebugEntry('Request parsed', {
      hasEmail: !!email,
      hasPassword: !!password,
      connection
    });
    
    // Validate inputs
    if (!email || !password) {
      addDebugEntry('Validation failed', { missingEmail: !email, missingPassword: !password });
      return NextResponse.json(
        { 
          error: 'Email and password are required',
          debugLog 
        },
        { status: 400 }
      );
    }
    
    // Get Auth0 configuration
    // Use custom domain for embedded login
    const auth0Domain = process.env.AUTH0_CUSTOM_DOMAIN || 'auth.dottapps.com';
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
    const clientSecret = process.env.AUTH0_CLIENT_SECRET;
    const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';
    
    addDebugEntry('Auth0 configuration', {
      domain: auth0Domain,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      audience,
      usingCustomDomain: !auth0Domain.includes('.auth0.com')
    });
    
    if (!clientId || !clientSecret) {
      addDebugEntry('Missing Auth0 credentials', { 
        missingClientId: !clientId, 
        missingClientSecret: !clientSecret 
      });
      return NextResponse.json(
        { 
          error: 'Auth0 configuration missing',
          debugLog 
        },
        { status: 500 }
      );
    }
    
    // Prepare token request
    const tokenEndpoint = `https://${auth0Domain}/oauth/token`;
    const tokenBody = {
      grant_type: 'password',
      username: email,
      password: password,
      client_id: clientId,
      client_secret: clientSecret,
      audience: audience,
      scope: 'openid profile email offline_access',
      connection: connection
    };
    
    addDebugEntry('Sending token request', {
      endpoint: tokenEndpoint,
      grantType: 'password',
      username: email,
      connection,
      scope: tokenBody.scope
    });
    
    // Make token request
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(tokenBody)
    });
    
    const responseText = await tokenResponse.text();
    let tokenData;
    
    try {
      tokenData = JSON.parse(responseText);
    } catch (parseError) {
      addDebugEntry('Failed to parse token response', {
        status: tokenResponse.status,
        responseText: responseText.substring(0, 200)
      });
      throw new Error('Invalid response from Auth0');
    }
    
    addDebugEntry('Token response received', {
      status: tokenResponse.status,
      ok: tokenResponse.ok,
      hasAccessToken: !!tokenData.access_token,
      hasIdToken: !!tokenData.id_token,
      hasRefreshToken: !!tokenData.refresh_token,
      error: tokenData.error,
      errorDescription: tokenData.error_description
    });
    
    if (!tokenResponse.ok) {
      // Handle specific Auth0 errors
      if (tokenData.error === 'invalid_grant') {
        return NextResponse.json(
          { 
            error: 'Invalid credentials',
            message: 'The email or password you entered is incorrect.',
            debugLog
          },
          { status: 401 }
        );
      }
      
      if (tokenData.error === 'too_many_attempts') {
        return NextResponse.json(
          { 
            error: 'Too many attempts',
            message: 'Your account has been temporarily locked due to too many failed login attempts.',
            debugLog
          },
          { status: 429 }
        );
      }
      
      // Handle unauthorized_client error
      if (tokenData.error === 'unauthorized_client') {
        addDebugEntry('Password grant not enabled', {
          error: tokenData.error,
          description: 'The Password grant type is not enabled for this application'
        });
        
        return NextResponse.json(
          { 
            error: 'Configuration error',
            message: 'Direct authentication is not enabled. Please enable the Password grant type in Auth0 Dashboard under Application Settings > Advanced Settings > Grant Types.',
            requiresUniversalLogin: true,
            debugLog
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          error: tokenData.error || 'Authentication failed',
          message: tokenData.error_description || 'Unable to authenticate with the provided credentials.',
          debugLog
        },
        { status: tokenResponse.status }
      );
    }
    
    // Get user info using the access token
    addDebugEntry('Fetching user info', { hasAccessToken: !!tokenData.access_token });
    
    const userInfoResponse = await fetch(`https://${auth0Domain}/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    let userInfo = {};
    if (userInfoResponse.ok) {
      userInfo = await userInfoResponse.json();
      addDebugEntry('User info retrieved', {
        hasSub: !!userInfo.sub,
        hasEmail: !!userInfo.email,
        hasName: !!userInfo.name,
        emailVerified: userInfo.email_verified
      });
    } else {
      addDebugEntry('Failed to fetch user info', {
        status: userInfoResponse.status,
        statusText: userInfoResponse.statusText
      });
    }
    
    // Create session data
    const sessionData = {
      access_token: tokenData.access_token,
      id_token: tokenData.id_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      user: {
        ...userInfo,
        email: userInfo.email || email,
        sub: userInfo.sub || tokenData.sub
      }
    };
    
    addDebugEntry('Authentication successful', {
      tokenType: sessionData.token_type,
      expiresIn: sessionData.expires_in,
      hasUser: !!sessionData.user,
      userEmail: sessionData.user.email
    });
    
    // Return success response
    return NextResponse.json({
      ...sessionData,
      debugLog,
      success: true
    });
    
  } catch (error) {
    addDebugEntry('Authentication error', {
      error: error.message,
      stack: error.stack
    });
    
    logger.error('[Auth/Authenticate] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        message: error.message,
        debugLog
      },
      { status: 500 }
    );
  }
}