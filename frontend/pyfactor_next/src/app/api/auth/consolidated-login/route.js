import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Consolidated login endpoint that handles authentication atomically
 * This follows security best practices by doing everything server-side
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }
    
    console.log('[ConsolidatedLogin] Starting atomic login flow for:', email);
    
    // Step 1: Authenticate with Auth0
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
    const authResponse = await fetch(`${baseUrl}/api/auth/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip'),
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.json();
      console.error('[ConsolidatedLogin] Auth failed:', error);
      return NextResponse.json(error, { status: authResponse.status });
    }
    
    const authData = await authResponse.json();
    console.log('[ConsolidatedLogin] Auth successful, creating consolidated session...');
    
    // Step 2: Call consolidated backend endpoint
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';
    console.log('[ConsolidatedLogin] Calling backend consolidated-auth at:', `${API_URL}/api/sessions/consolidated-auth/`);
    
    const consolidatedResponse = await fetch(`${API_URL}/api/sessions/consolidated-auth/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://dottapps.com',
      },
      body: JSON.stringify({
        auth0_sub: authData.user.sub,
        email: authData.user.email,
        access_token: authData.access_token,
        name: authData.user.name,
        given_name: authData.user.given_name,
        family_name: authData.user.family_name,
        picture: authData.user.picture,
        email_verified: authData.user.email_verified
      })
    });
    
    if (!consolidatedResponse.ok) {
      const contentType = consolidatedResponse.headers.get('content-type');
      let error;
      
      if (contentType && contentType.includes('application/json')) {
        error = await consolidatedResponse.json();
      } else {
        // Backend returned HTML (likely error page), extract text
        const text = await consolidatedResponse.text();
        console.error('[ConsolidatedLogin] Backend returned HTML:', text.substring(0, 500));
        error = { 
          error: 'Backend error', 
          message: 'The backend service is not responding correctly',
          details: consolidatedResponse.status === 404 ? 'Endpoint not found' : 'Internal server error'
        };
      }
      
      console.error('[ConsolidatedLogin] Session creation failed:', error);
      return NextResponse.json(error, { status: consolidatedResponse.status });
    }
    
    const sessionData = await consolidatedResponse.json();
    console.log('[ConsolidatedLogin] Consolidated auth successful:', {
      hasSession: !!sessionData.session_token,
      hasTenant: !!sessionData.tenant,
      needsOnboarding: sessionData.needs_onboarding
    });
    
    // Step 3: Return complete response with all data
    const response = NextResponse.json({
      success: true,
      ...authData,  // Auth0 tokens
      ...sessionData,  // Session and user data
      // Ensure consistent field names
      needs_onboarding: sessionData.needs_onboarding,
      tenant_id: sessionData.tenant?.id || sessionData.tenant_id
    });
    
    // Parse and set cookies properly
    // Next.js doesn't forward set-cookie headers automatically, we need to parse them
    const cookieStore = cookies();
    
    // Get all set-cookie headers from backend
    const setCookieHeaders = consolidatedResponse.headers.getSetCookie?.() || [];
    console.log('[ConsolidatedLogin] Backend set-cookie headers:', setCookieHeaders.length);
    
    if (setCookieHeaders.length > 0) {
      // Parse each cookie and set it
      setCookieHeaders.forEach(cookieString => {
        // Parse cookie string (e.g., "sid=abc123; Path=/; HttpOnly; Secure")
        const [nameValue, ...attributes] = cookieString.split(';').map(s => s.trim());
        const [name, value] = nameValue.split('=');
        
        // Parse cookie attributes
        const cookieOptions = {
          value,
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/'
        };
        
        // Parse additional attributes
        attributes.forEach(attr => {
          const [key, val] = attr.split('=').map(s => s.trim());
          if (key.toLowerCase() === 'max-age') {
            cookieOptions.maxAge = parseInt(val);
          } else if (key.toLowerCase() === 'domain') {
            cookieOptions.domain = val;
          } else if (key.toLowerCase() === 'samesite') {
            cookieOptions.sameSite = val.toLowerCase();
          }
        });
        
        console.log('[ConsolidatedLogin] Setting cookie:', name, 'with options:', cookieOptions);
        cookieStore.set(name, value, cookieOptions);
      });
    } else {
      // Fallback - check for single set-cookie header
      const setCookieHeader = consolidatedResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        console.log('[ConsolidatedLogin] Found single set-cookie header');
        // For single header, we'll set the session cookies manually
        if (sessionData.session_token) {
          cookieStore.set('sid', sessionData.session_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 86400 // 24 hours
          });
          cookieStore.set('session_token', sessionData.session_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 86400 // 24 hours
          });
          console.log('[ConsolidatedLogin] Manually set session cookies for:', sessionData.session_token);
        }
      } else {
        console.warn('[ConsolidatedLogin] No set-cookie headers found, setting cookies manually');
        // If no cookies from backend, set them ourselves
        if (sessionData.session_token) {
          cookieStore.set('sid', sessionData.session_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 86400 // 24 hours
          });
          cookieStore.set('session_token', sessionData.session_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 86400 // 24 hours
          });
          console.log('[ConsolidatedLogin] Fallback: Set session cookies for:', sessionData.session_token);
        }
      }
    }
    
    return response;
    
  } catch (error) {
    console.error('[ConsolidatedLogin] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Login failed',
      message: error.message 
    }, { status: 500 });
  }
}