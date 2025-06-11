import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

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
    
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session');
    
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
    
    // Parse secure session cookie
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
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
    
    // Return session data (never include sensitive tokens in response)
    return NextResponse.json({
      user: sessionData.user,
      authenticated: true,
      expiresAt: sessionData.expiresAt
    });
    
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
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    // Encode session data
    const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        ...user,
        needsOnboarding,
        tenantId
      }
    });
    
    // Set secure HttpOnly cookie
    response.cookies.set('dott_auth_session', encodedSession, COOKIE_OPTIONS);
    
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