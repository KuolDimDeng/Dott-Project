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
  domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
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
    
    // Get session cookie - check both names
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    console.log('[Auth Session] Cookie check:', {
      hasDottAuthSession: !!cookieStore.get('dott_auth_session'),
      hasAppSession: !!cookieStore.get('appSession'),
      cookieName: sessionCookie?.name,
      cookieSize: sessionCookie?.value?.length
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
    
    // Return session data (never include sensitive tokens in response)
    const response = NextResponse.json({
      user: sessionData.user,
      authenticated: true,
      expiresAt: sessionData.expiresAt,
      csrfToken: csrfToken
    });
    
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
    
    // Check onboarding status
    let needsOnboarding = true;
    let tenantId = null;
    
    try {
      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        needsOnboarding = profileData.needs_onboarding !== false;
        tenantId = profileData.tenant_id;
      }
    } catch (error) {
      console.error('[Auth Session POST] Profile check error:', error);
    }
    
    // Create secure session data
    const sessionData = {
      user: {
        ...user,
        needsOnboarding,
        tenantId
      },
      accessToken,
      idToken,
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
        tenantId
      }
    });
    
    // Set secure HttpOnly cookie with encrypted data
    response.cookies.set('dott_auth_session', encryptedSession, {
      ...COOKIE_OPTIONS,
      maxAge: 24 * 60 * 60 // 24 hours
    });
    
    console.log('[Auth Session POST] Session created successfully');
    
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