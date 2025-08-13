import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';
import { isUsingBackendAuth } from '@/lib/auth0-server-config';

/**
 * Direct Email/Password Authentication Endpoint
 * Handles authentication through Auth0's Resource Owner Password Grant
 * Uses custom domain for embedded login experience
 * Note: Rate limiting is handled by Auth0, not at the frontend level
 */
export async function POST(request) {
  // Auth0 handles rate limiting, no need for frontend rate limiting

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
    // IMPORTANT: Password grant MUST use the actual Auth0 domain, not custom domain
    // Custom domains don't support the /oauth/token endpoint for password grants
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com';
    
    // DEBUG: Log all environment variables to understand configuration
    console.log('🔍 [AUTH DEBUG] ===== ENVIRONMENT CONFIGURATION =====');
    console.log('🔍 [AUTH DEBUG] NEXT_PUBLIC_AUTH0_DOMAIN:', process.env.NEXT_PUBLIC_AUTH0_DOMAIN);
    console.log('🔍 [AUTH DEBUG] AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN);
    console.log('🔍 [AUTH DEBUG] NEXT_PUBLIC_AUTH0_CLIENT_ID:', process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID);
    console.log('🔍 [AUTH DEBUG] AUTH0_CLIENT_ID:', process.env.AUTH0_CLIENT_ID);
    console.log('🔍 [AUTH DEBUG] AUTH0_CLIENT_SECRET exists:', !!process.env.AUTH0_CLIENT_SECRET);
    console.log('🔍 [AUTH DEBUG] NEXT_PUBLIC_AUTH0_AUDIENCE:', process.env.NEXT_PUBLIC_AUTH0_AUDIENCE);
    console.log('🔍 [AUTH DEBUG] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('🔍 [AUTH DEBUG] Final auth0Domain being used:', auth0Domain);
    console.log('🔍 [AUTH DEBUG] ===== END ENVIRONMENT CONFIGURATION =====');
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
    const clientSecret = process.env.AUTH0_CLIENT_SECRET;
    const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 
                     (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ? 'https://api-staging.dottapps.com' : 'https://api.dottapps.com');
    
    addDebugEntry('Auth0 configuration', {
      domain: auth0Domain,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      audience,
      usingCustomDomain: !auth0Domain.includes('.auth0.com')
    });
    
    if (!clientId || !clientSecret || isUsingBackendAuth()) {
      addDebugEntry('Proxying authentication through backend', { 
        missingClientId: !clientId, 
        missingClientSecret: !clientSecret,
        isUsingBackendAuth: isUsingBackendAuth()
      });
      
      // When secrets are missing, proxy through backend password login endpoint
      addDebugEntry('Auth0 secrets not available, proxying through backend');
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 
                      (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ? 'https://dott-api-staging.onrender.com' : 'https://api.dottapps.com');
      const cookieStore = cookies();
      
      // DEBUG: Log backend proxy details
      console.log('🔐 [BACKEND PROXY] ===== BACKEND AUTHENTICATION =====');
      console.log('🔐 [BACKEND PROXY] Using backend authentication');
      console.log('🔐 [BACKEND PROXY] API URL:', API_URL);
      console.log('🔐 [BACKEND PROXY] Email:', email);
      console.log('🔐 [BACKEND PROXY] Password length:', password?.length);
      console.log('🔐 [BACKEND PROXY] ===================================');
      
      addDebugEntry('Backend proxy configuration', {
        apiUrl: API_URL,
        endpoint: `${API_URL}/api/auth/password-login/`,
        hasCookies: !!cookieStore
      });
      
      try {
        // Call the new backend password login endpoint
        const backendUrl = `${API_URL}/api/auth/password-login/`;
        addDebugEntry('Making backend request', { url: backendUrl });
        
        // DEBUG: Log the exact request being made
        console.log('🌐 [BACKEND REQUEST] Making request to:', backendUrl);
        console.log('🌐 [BACKEND REQUEST] Request body:', { email, passwordLength: password?.length });
        
        const backendResponse = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieStore.toString(),
            'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip'),
          },
          body: JSON.stringify({ email, password })
        });
        
        console.log('🌐 [BACKEND RESPONSE] Status:', backendResponse.status);
        console.log('🌐 [BACKEND RESPONSE] Status Text:', backendResponse.statusText);
        
        const responseText = await backendResponse.text();
        addDebugEntry('Backend raw response', {
          status: backendResponse.status,
          contentType: backendResponse.headers.get('content-type'),
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 200)
        });
        
        let backendResult;
        try {
          backendResult = JSON.parse(responseText);
        } catch (parseError) {
          addDebugEntry('Failed to parse backend response', {
            error: parseError.message,
            responseText: responseText.substring(0, 500)
          });
          throw new Error('Invalid response from authentication service');
        }
        
        if (!backendResponse.ok) {
          // DEBUG: Log detailed error information
          console.error('❌ [BACKEND ERROR] Authentication failed');
          console.error('❌ [BACKEND ERROR] Status:', backendResponse.status);
          console.error('❌ [BACKEND ERROR] Error response:', backendResult);
          console.error('❌ [BACKEND ERROR] Full URL:', backendUrl);
          console.error('❌ [BACKEND ERROR] API URL from env:', process.env.NEXT_PUBLIC_API_URL);
          
          addDebugEntry('Backend password login failed', { 
            status: backendResponse.status,
            error: backendResult,
            fullUrl: backendUrl
          });
          
          // Map backend error to frontend format
          let errorMessage = backendResult.error || 'Authentication failed';
          if (backendResponse.status === 401) {
            errorMessage = 'Invalid email or password';
          } else if (backendResponse.status === 403) {
            errorMessage = backendResult.error || 'Account access denied';
          }
          
          return NextResponse.json(
            { 
              error: errorMessage,
              debugLog,
              backendStatus: backendResponse.status,
              backendUrl: backendUrl,
              envApiUrl: process.env.NEXT_PUBLIC_API_URL
            },
            { status: backendResponse.status }
          );
        }
        
        // DEBUG: Log successful authentication
        console.log('✅ [BACKEND SUCCESS] Authentication successful');
        console.log('✅ [BACKEND SUCCESS] User:', backendResult.user?.email);
        console.log('✅ [BACKEND SUCCESS] Session ID exists:', !!backendResult.session_id);
        console.log('✅ [BACKEND SUCCESS] Tenant ID exists:', !!backendResult.tenant_id);
        
        addDebugEntry('Backend password login successful', { 
          hasUser: !!backendResult.user,
          hasSession: !!backendResult.session_id,
          hasTenant: !!backendResult.tenant_id 
        });
        
        // Transform backend response to match Auth0 format expected by frontend
        // IMPORTANT: Use a dummy token, not the session_id, to avoid confusion
        const auth0FormattedResponse = {
          user: {
            sub: backendResult.auth0_sub || backendResult.user?.auth0_sub || `auth0|${backendResult.user?.id}`,
            email: backendResult.user?.email || email,
            name: backendResult.user?.name || backendResult.user?.email,
            given_name: backendResult.user?.given_name || backendResult.user?.first_name || '',
            family_name: backendResult.user?.family_name || backendResult.user?.last_name || '',
            picture: backendResult.user?.picture || '',
            email_verified: backendResult.user?.email_verified !== false
          },
          access_token: 'backend_authenticated', // Use a fixed token to indicate backend auth
          id_token: 'backend_authenticated',
          token_type: 'Bearer',
          expires_in: 86400,
          // Include the actual session_id separately
          backend_session_id: backendResult.session_id
        };
        
        return NextResponse.json(auth0FormattedResponse);
        
      } catch (error) {
        addDebugEntry('Backend proxy error', { 
          message: error.message,
          type: error.constructor.name 
        });
        return NextResponse.json(
          { 
            error: 'Authentication service unavailable',
            debugLog 
          },
          { status: 503 }
        );
      }
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
    let tokenResponse;
    try {
      tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(tokenBody)
      });
    } catch (fetchError) {
      addDebugEntry('Network error during token request', {
        message: fetchError.message,
        type: fetchError.constructor.name,
        cause: fetchError.cause,
        endpoint: tokenEndpoint
      });
      throw new Error(`Network error: ${fetchError.message}`);
    }
    
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
        // Check if the error is due to email verification
        if (tokenData.error_description && 
            (tokenData.error_description.toLowerCase().includes('verify') || 
             tokenData.error_description.toLowerCase().includes('verification') ||
             tokenData.error_description.toLowerCase().includes('email'))) {
          return NextResponse.json(
            { 
              error: 'email_not_verified',
              message: 'Please verify your email address before signing in. Check your inbox for the verification email.',
              debugLog
            },
            { status: 401 }
          );
        }
        
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
      if (tokenData.error === 'unauthorized_client' || tokenData.error_description?.includes('Grant type')) {
        addDebugEntry('Password grant not enabled', {
          error: tokenData.error,
          description: tokenData.error_description || 'The Password grant type is not enabled for this application'
        });
        
        // Log the exact error for debugging
        console.error('[Auth/Authenticate] Auth0 Grant Type Error:', {
          error: tokenData.error,
          error_description: tokenData.error_description,
          auth0Domain,
          clientId,
          grantType: 'password'
        });
        
        return NextResponse.json(
          { 
            error: 'Configuration error',
            message: 'Direct authentication is not enabled. Please enable the Password grant type in Auth0 Dashboard under Application Settings > Advanced Settings > Grant Types.',
            requiresUniversalLogin: true,
            auth0Error: tokenData.error,
            auth0ErrorDescription: tokenData.error_description,
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
    
    let userInfoResponse;
    try {
      userInfoResponse = await fetch(`https://${auth0Domain}/userinfo`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      });
    } catch (fetchError) {
      addDebugEntry('Network error fetching user info', {
        message: fetchError.message,
        type: fetchError.constructor.name,
        endpoint: `https://${auth0Domain}/userinfo`
      });
      // Don't throw here, continue without user info
      userInfoResponse = { ok: false };
    }
    
    let userInfo = {};
    if (userInfoResponse.ok) {
      userInfo = await userInfoResponse.json();
      addDebugEntry('User info retrieved', {
        hasSub: !!userInfo.sub,
        hasEmail: !!userInfo.email,
        hasName: !!userInfo.name,
        emailVerified: userInfo.email_verified
      });
      
      // Check if email is verified
      if (userInfo.email_verified === false) {
        addDebugEntry('Email not verified', { email: userInfo.email });
        return NextResponse.json(
          { 
            error: 'email_not_verified',
            message: 'Please verify your email address before signing in. Check your inbox for the verification email.',
            email: userInfo.email,
            debugLog
          },
          { status: 401 }
        );
      }
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