import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { encrypt, decrypt } from '@/utils/sessionEncryption';
import { generateCSRFToken } from '@/utils/csrf';

// Cookie configuration for production
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days
  // Remove domain to let browser handle it automatically
  // This ensures cookies work across subdomains without explicit configuration
  // domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
};

/**
 * Session endpoint - Handles secure session management
 * GET: Retrieve current session
 * POST: Create new session (login)
 * DELETE: Clear session (logout)
 */

export async function GET(request) {
  try {
    console.log('[Auth Session] Getting session data');
    
    // CRITICAL: Force fresh cookie read by awaiting cookies()
    const cookieStore = await cookies();
    
    // First check for the main dott_auth_session cookie
    const dottSessionCookie = cookieStore.get('dott_auth_session');
    
    if (dottSessionCookie) {
      console.log('[Auth Session] Found dott_auth_session cookie, processing...');
      // Skip to the main session processing below
    }
    
    // Check for backend session token as fallback
    const sessionTokenCookie = cookieStore.get('session_token');
    
    if (!dottSessionCookie && sessionTokenCookie) {
      console.log('[Auth Session] Found backend session token');
      
      try {
        // Call backend to get session details
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
        const sessionResponse = await fetch(`${apiUrl}/api/sessions/current/`, {
          headers: {
            'Authorization': `Session ${sessionTokenCookie.value}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (sessionResponse.ok) {
          const backendSession = await sessionResponse.json();
          console.log('[Auth Session] Retrieved backend session:', {
            user_email: backendSession.user?.email,
            needs_onboarding: backendSession.needs_onboarding,
            tenant_id: backendSession.tenant?.id
          });
          
          // Generate CSRF token for the session
          const csrfToken = generateCSRFToken();
          
          // Return session data in the expected format
          const response = NextResponse.json({
            user: {
              ...backendSession.user,
              needsOnboarding: backendSession.needs_onboarding,
              needs_onboarding: backendSession.needs_onboarding,
              onboardingCompleted: backendSession.onboarding_completed,
              onboarding_completed: backendSession.onboarding_completed,
              tenantId: backendSession.tenant?.id,
              tenant_id: backendSession.tenant?.id,
              subscriptionPlan: backendSession.subscription_plan,
              subscription_plan: backendSession.subscription_plan
            },
            authenticated: true,
            expiresAt: backendSession.expires_at,
            csrfToken: csrfToken,
            sessionToken: sessionTokenCookie.value
          });
          
          // Add cache control headers
          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          response.headers.set('Pragma', 'no-cache');
          response.headers.set('Expires', '0');
          
          return response;
        } else {
          console.error('[Auth Session] Backend session validation failed:', sessionResponse.status);
          // Clear invalid session token
          const response = NextResponse.json(null, { status: 200 });
          response.cookies.delete('session_token');
          return response;
        }
      } catch (error) {
        console.error('[Auth Session] Backend session fetch error:', error);
        // Fall through to legacy cookie check
      }
    }
    
    // Check for onboarding status cookie first (non-httpOnly)
    const statusCookie = cookieStore.get('onboarding_status');
    if (statusCookie) {
      try {
        const status = JSON.parse(statusCookie.value);
        console.log('[Auth Session] Onboarding status cookie:', status);
      } catch (e) {
        console.error('[Auth Session] Failed to parse status cookie:', e);
      }
    }
    
    // Get session cookie - prefer dott_auth_session
    const sessionCookie = dottSessionCookie || cookieStore.get('appSession');
    
    console.log('[Auth Session] Cookie check:', {
      hasSessionToken: !!sessionTokenCookie,
      hasDottAuthSession: !!dottSessionCookie,
      hasAppSession: !!cookieStore.get('appSession'),
      cookieName: sessionCookie?.name,
      cookieSize: sessionCookie?.value?.length,
      allCookies: Array.from(cookieStore.getAll()).map(c => ({ name: c.name, size: c.value?.length }))
    });
    
    if (!sessionCookie) {
      // For backward compatibility, check Authorization header
      // This should be removed once all clients use cookies
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        console.warn('[Auth Session] Using deprecated Authorization header method');
        const token = authHeader.substring(7);
        
        try {
          // Decode token for user info
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            
            // Check expiration
            if (payload.exp && Date.now() / 1000 > payload.exp) {
              return NextResponse.json(null, { status: 200 });
            }
            
            return NextResponse.json({
              user: {
                email: payload.email,
                sub: payload.sub,
                name: payload.name || payload.email
              },
              accessToken: token,
              authenticated: true,
              warning: 'Please update to cookie-based authentication'
            });
          }
        } catch (error) {
          console.error('[Auth Session] Token decode error:', error);
        }
      }
      
      return NextResponse.json(null, { status: 200 });
    }
    
    // Parse and decrypt secure session cookie
    let sessionData;
    try {
      // Try to decrypt first (new format)
      try {
        const decrypted = decrypt(sessionCookie.value);
        sessionData = JSON.parse(decrypted);
      } catch (decryptError) {
        // Fallback to old base64 format for backward compatibility
        console.warn('[Auth Session] Using legacy base64 format - will re-encrypt on next write');
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      }
    } catch (error) {
      console.error('[Auth Session] Cookie parse error:', error);
      return NextResponse.json(null, { status: 200 });
    }
    
    // Validate session
    if (!sessionData.user || !sessionData.accessToken) {
      return NextResponse.json(null, { status: 200 });
    }
    
    // Check expiration
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      console.log('[Auth Session] Session expired');
      return NextResponse.json(null, { status: 200 });
    }
    
    console.log('[Auth Session] Valid session found for:', sessionData.user.email);
    
    // Generate CSRF token for the session
    const csrfToken = generateCSRFToken();
    
    // Return session data (include sessionToken for v2 onboarding)
    const responseData = {
      user: sessionData.user,
      authenticated: true,
      expiresAt: sessionData.expiresAt,
      csrfToken: csrfToken
    };
    
    // Include sessionToken if available (for v2 onboarding)
    if (sessionData.sessionToken) {
      responseData.sessionToken = sessionData.sessionToken;
    }
    
    const response = NextResponse.json(responseData);
    
    // Add cache control headers to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error) {
    console.error('[Auth Session] GET error:', error);
    return NextResponse.json({ 
      error: 'Session error' 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    console.log('[Auth Session POST] Creating new session');
    
    const body = await request.json();
    const { accessToken, idToken, user } = body;
    
    if (!accessToken || !user) {
      return NextResponse.json({ 
        error: 'Missing required session data' 
      }, { status: 400 });
    }
    
    console.log('[Auth Session POST] Creating session for:', user.email);
    
    // Check onboarding status from backend
    let needsOnboarding = true;
    let tenantId = null;
    let onboardingCompleted = false;
    let subscriptionPlan = 'free';
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
      const profileResponse = await fetch(`${apiUrl}/api/users/me/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('[Auth Session POST] Backend profile data:', {
          needs_onboarding: profileData.needs_onboarding,
          onboarding_completed: profileData.onboarding_completed,
          tenant_id: profileData.tenant_id
        });
        
        needsOnboarding = profileData.needs_onboarding !== false;
        onboardingCompleted = profileData.onboarding_completed === true;
        tenantId = profileData.tenant_id;
        
        // Get subscription plan from onboarding progress
        if (profileData.onboarding && profileData.onboarding.subscription_plan) {
          subscriptionPlan = profileData.onboarding.subscription_plan;
        }
      }
    } catch (error) {
      console.error('[Auth Session POST] Profile check error:', error);
    }
    
    // Create backend session first
    let sessionToken = null;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
      console.log('[Auth Session POST] Creating backend session at:', `${apiUrl}/api/sessions/create/`);
      
      const backendSessionResponse = await fetch(`${apiUrl}/api/sessions/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          needs_onboarding: needsOnboarding,
          onboarding_completed: onboardingCompleted,
          subscription_plan: subscriptionPlan,
          tenant_id: tenantId
        })
      });
      
      if (backendSessionResponse.ok) {
        const backendSession = await backendSessionResponse.json();
        sessionToken = backendSession.session_token;
        console.log('[Auth Session POST] Backend session created successfully');
      } else {
        console.error('[Auth Session POST] Backend session creation failed:', backendSessionResponse.status);
      }
    } catch (error) {
      console.error('[Auth Session POST] Backend session creation error:', error);
    }
    
    // Create secure session data (for backward compatibility)
    const sessionData = {
      user: {
        ...user,
        needsOnboarding,
        needs_onboarding: needsOnboarding,
        onboardingCompleted,
        onboarding_completed: onboardingCompleted,
        tenantId,
        tenant_id: tenantId,
        subscriptionPlan,
        subscription_plan: subscriptionPlan,
        selectedPlan: subscriptionPlan,
        selected_plan: subscriptionPlan,
        subscriptionType: subscriptionPlan,
        subscription_type: subscriptionPlan
      },
      accessToken,
      idToken,
      sessionToken, // Include backend session token if available
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours (reduced from 7 days)
    };
    
    // Encrypt session data
    const encryptedSession = encrypt(JSON.stringify(sessionData));
    
    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        ...user,
        needsOnboarding,
        needs_onboarding: needsOnboarding,
        onboardingCompleted,
        onboarding_completed: onboardingCompleted,
        tenantId,
        tenant_id: tenantId
      }
    });
    
    // Set secure HttpOnly cookie with encrypted data
    const cookieOptions = {
      ...COOKIE_OPTIONS,
      maxAge: 24 * 60 * 60 // 24 hours
    };
    
    console.log('[Auth Session POST] Setting cookies with options:', {
      domain: cookieOptions.domain,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      httpOnly: cookieOptions.httpOnly,
      path: cookieOptions.path,
      sessionSize: encryptedSession.length
    });
    
    // Set the main session cookie
    response.cookies.set('dott_auth_session', encryptedSession, cookieOptions);
    
    console.log('[Auth Session POST] Session cookie set:', {
      name: 'dott_auth_session',
      size: encryptedSession.length,
      domain: cookieOptions.domain
    });
    
    // Also set the backend session token if available
    if (sessionToken) {
      response.cookies.set('session_token', sessionToken, cookieOptions);
      console.log('[Auth Session POST] Backend session token set');
    }
    
    // Also set a client-readable status cookie for immediate checks
    const statusCookie = {
      needsOnboarding,
      onboardingCompleted,
      tenantId,
      hasSession: true
    };
    response.cookies.set('onboarding_status', JSON.stringify(statusCookie), {
      ...cookieOptions,
      httpOnly: false // Make this readable by client-side JavaScript
    });
    
    console.log('[Auth Session POST] Session created successfully with status cookie');
    
    return response;
    
  } catch (error) {
    console.error('[Auth Session POST] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to create session' 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    console.log('[Auth Session DELETE] Clearing session');
    
    const response = NextResponse.json({ 
      success: true,
      message: 'Session cleared' 
    });
    
    // Clear the session cookie
    response.cookies.set('dott_auth_session', '', {
      ...COOKIE_OPTIONS,
      maxAge: 0
    });
    
    // Also clear any legacy cookies
    response.cookies.set('appSession', '', {
      ...COOKIE_OPTIONS,
      maxAge: 0
    });
    
    return response;
    
  } catch (error) {
    console.error('[Auth Session DELETE] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to clear session' 
    }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}