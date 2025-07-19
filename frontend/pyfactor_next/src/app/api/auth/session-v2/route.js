import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCSRFToken } from '@/utils/csrf';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/utils/logger';
import { safeJsonParse } from '@/utils/responseParser';

/**
 * PERMANENT FIX: Server-Side Session Management - Version 2
 * 
 * Now uses unified profile endpoint that applies business logic
 * to resolve onboarding status conflicts permanently.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';

export async function GET(request) {
  return await Sentry.startSpan(
    { name: 'GET /api/auth/session-v2', op: 'http.server' },
    async () => {
      try {
    const cookieStore = cookies();
    
    // CRITICAL: Log Cloudflare headers to debug interference
    console.log('[Session-V2] 🔴 CLOUDFLARE DEBUG START 🔴');
    console.log('[Session-V2] Cloudflare headers:');
    console.log('  - CF-Ray:', request.headers.get('cf-ray'));
    console.log('  - CF-IPCountry:', request.headers.get('cf-ipcountry'));
    console.log('  - CF-Visitor:', request.headers.get('cf-visitor'));
    console.log('  - CF-Connecting-IP:', request.headers.get('cf-connecting-ip'));
    console.log('  - CF-Request-ID:', request.headers.get('cf-request-id'));
    console.log('  - CF-Worker:', request.headers.get('cf-worker'));
    console.log('  - CF-Cache-Status:', request.headers.get('cf-cache-status'));
    
    // Log all cookies for debugging
    const allCookies = cookieStore.getAll();
    console.log('[Session-V2] All cookies:', allCookies.map(c => ({ name: c.name, value: c.value?.substring(0, 8) + '...' })));
    
    // Check for Cloudflare cookies
    const cfCookies = allCookies.filter(c => c.name.startsWith('__cf') || c.name.startsWith('cf_'));
    if (cfCookies.length > 0) {
      console.log('[Session-V2] Cloudflare cookies found:', cfCookies.map(c => c.name));
    }
    
    // Additional debugging for cookie issues
    console.log('[Session-V2] Request details:');
    console.log('  - URL:', request.url);
    console.log('  - Method:', request.method);
    console.log('  - Headers:', {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip')
    });
    
    // Check for both cookie names
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    // CRITICAL: Also check raw cookie header
    const rawCookieHeader = request.headers.get('cookie');
    console.log('[Session-V2] 🔴 RAW COOKIE HEADER:', rawCookieHeader);
    if (rawCookieHeader) {
      console.log('[Session-V2] 🔴 Parsing raw cookies:');
      const rawCookies = rawCookieHeader.split(';').map(c => c.trim());
      rawCookies.forEach(cookie => {
        const [name, value] = cookie.split('=');
        if (name === 'sid' || name === 'session_token') {
          console.log(`[Session-V2] 🔴 Found ${name} in raw header:`, value?.substring(0, 20) + '...');
        }
      });
    }
    
    console.log('[Session-V2] Cookie details:');
    console.log('  - sid cookie:', sidCookie ? { value: sidCookie.value.substring(0, 8) + '...', name: sidCookie.name } : 'NOT FOUND');
    console.log('  - session_token cookie:', sessionTokenCookie ? { value: sessionTokenCookie.value.substring(0, 8) + '...', name: sessionTokenCookie.name } : 'NOT FOUND');
    
    // Log request headers to see what's being sent
    console.log('[Session-V2] Request headers:');
    console.log('  - Cookie header:', request.headers.get('cookie'));
    console.log('  - Origin:', request.headers.get('origin'));
    console.log('  - Referer:', request.headers.get('referer'));
    console.log('  - User-Agent:', request.headers.get('user-agent'));
    
    // Also try to parse cookie header manually
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      console.log('[Session-V2] Manual cookie parse:');
      const cookies = cookieHeader.split(';').map(c => c.trim());
      cookies.forEach(cookie => {
        const [name, value] = cookie.split('=');
        if (name && (name.includes('sid') || name.includes('session'))) {
          console.log(`  - ${name}: ${value?.substring(0, 8)}...`);
        }
      });
    }
    
    const sessionId = sidCookie || sessionTokenCookie;
    
        if (!sessionId) {
          logger.info('[Session-V2] No session ID found');
      // Return unauthenticated response
      const response = NextResponse.json({ 
        authenticated: false
      }, { status: 401 });
      
      // Clear any stale cookies with explicit options
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieDomain = isProduction ? '.dottapps.com' : undefined;
      
      const clearOptions = {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 0
        // Don't set domain for better compatibility
      };
      
      response.cookies.set('sid', '', clearOptions);
      response.cookies.set('session_token', '', clearOptions);
      
      return response;
    }
    
        logger.info('[Session-V2] Found session ID, validating with backend...', {
          sessionId: sessionId.value.substring(0, 8) + '...',
          cookieName: sessionId.name,
          fullSessionId: sessionId.value,
          sessionIdLength: sessionId.value.length
        });
        
        // Log the full session ID for debugging (temporarily)
        console.log('[Session-V2] FULL SESSION ID:', sessionId.value);
        
        // Fetch session from backend - single source of truth
        // Use the validate endpoint which is designed for session validation
        const startTime = Date.now();
        let response;
        try {
          const validateUrl = `${API_URL}/api/sessions/validate/${sessionId.value}/`;
          console.log('[Session-V2] Validating against URL:', validateUrl);
          
          response = await fetch(validateUrl, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Session ${sessionId.value}` // Add session token as Authorization header
            },
            cache: 'no-store' // Never cache session data
          });
        } catch (fetchError) {
          logger.error('[Session-V2] Failed to fetch session from backend:', {
            error: fetchError.message,
            sessionId: sessionId.value.substring(0, 8) + '...'
          });
          throw new Error('Failed to validate session with backend');
        }
    
        const duration = Date.now() - startTime;
        logger.info('[Session-V2] API call completed', {
          method: 'GET',
          url: `${API_URL}/api/sessions/validate/${sessionId.value}/`,
          status: response.status,
          duration: `${duration}ms`
        });
        
        if (!response.ok) {
          // Get error details
          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.detail || JSON.stringify(errorData);
          } catch (e) {
            errorDetails = await response.text();
          }
          
          logger.warn('[Session-V2] Backend validation failed', { 
            status: response.status,
            error: errorDetails,
            sessionId: sessionId.value.substring(0, 8) + '...'
          });
          
          // If it's a 404, the session endpoint might not exist
          if (response.status === 404) {
            logger.error('[Session-V2] Session endpoint not found, check backend URLs');
          }
          
          // TEMPORARY: If validation fails but we have a cookie, it might be from consolidated-auth
          // The backend bug causes tokens to not be persisted properly
          console.log('[Session-V2] WARNING: Session validation failed but cookie exists');
          console.log('[Session-V2] This may be due to backend consolidated-auth bug');
          
      // Clear invalid session with explicit options
      const res = NextResponse.json({ 
        authenticated: false,
        error: errorDetails
      }, { status: 401 });
      
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieDomain = isProduction ? '.dottapps.com' : undefined;
      
      const clearOptions = {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 0
        // Don't set domain for better compatibility
      };
      
      res.cookies.set('sid', '', clearOptions);
      res.cookies.set('session_token', '', clearOptions);
      
      return res;
    }
    
    let sessionData;
    try {
      const responseContentType = response.headers.get('content-type');
      
      if (responseContentType && responseContentType.includes('application/json')) {
        sessionData = await response.json();
        console.log('[Session-V2] Full backend response:', JSON.stringify(sessionData, null, 2));
      } else {
        const responseText = await response.text();
        logger.error('[Session-V2] Non-JSON response from backend:', {
          status: response.status,
          contentType: responseContentType,
          text: responseText.substring(0, 500)
        });
        
        // Handle different types of non-JSON responses
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
          throw new Error('Backend returned HTML page instead of session data');
        } else if (responseText.includes('502 Bad Gateway') || responseText.includes('504 Gateway')) {
          throw new Error('Backend service is temporarily unavailable');
        } else if (responseText.includes('403 Forbidden') || responseText.includes('401 Unauthorized')) {
          throw new Error('Session authentication failed');
        } else {
          throw new Error('Backend returned invalid response format');
        }
      }
    } catch (parseError) {
      logger.error('[Session-V2] Failed to parse response:', {
        error: parseError.message,
        responseStatus: response.status,
        responseHeaders: Object.fromEntries(response.headers)
      });
      
      // If it's already our custom error, re-throw it
      if (parseError.message.includes('Backend returned') || parseError.message.includes('Backend service')) {
        throw parseError;
      }
      
      throw new Error('Invalid response from backend');
    }
    console.log('[Session-V2] Backend session valid:', {
      email: sessionData.email || sessionData.user?.email,
      tenantId: sessionData.tenant_id || sessionData.tenant?.id,
      needsOnboarding: sessionData.needs_onboarding,
      onboardingCompleted: sessionData.onboarding_completed
    });
    
    // CRITICAL DEBUG: Log the exact values being returned
    console.log('[Session-V2] CRITICAL - Onboarding status from backend:', {
      needs_onboarding: sessionData.needs_onboarding,
      onboarding_completed: sessionData.onboarding_completed,
      typeof_needs_onboarding: typeof sessionData.needs_onboarding,
      typeof_onboarding_completed: typeof sessionData.onboarding_completed
    });
    
    // SIMPLIFIED: Direct backend data without internal HTTP calls
    // The backend session data is already authoritative
    
    // Return session data from backend
    // Check if data is nested in a 'user' object
    const userData = sessionData.user || sessionData;
    const tenantData = sessionData.tenant || {};
    
    // CRITICAL DEBUG: Log exact backend structure for DashAppBar
    console.log('[Session-V2] Backend data structure:', {
      hasUser: !!sessionData.user,
      hasTenant: !!sessionData.tenant,
      userFields: userData ? Object.keys(userData) : [],
      tenantFields: tenantData ? Object.keys(tenantData) : [],
      userData: {
        email: userData.email,
        name: userData.name,
        given_name: userData.given_name,
        family_name: userData.family_name,
        business_name: userData.business_name,
        subscription_plan: userData.subscription_plan,
        role: userData.role
      },
      tenantData: {
        id: tenantData.id,
        name: tenantData.name,
        subscription_plan: tenantData.subscription_plan
      },
      // Additional fields that might contain business info
      directBusinessName: sessionData.business_name,
      directTenantName: sessionData.tenant_name,
      directSubscriptionPlan: sessionData.subscription_plan || sessionData.selected_plan
    });
    
    return NextResponse.json({
      authenticated: true,
      csrfToken: generateCSRFToken(),
      user: {
        // Direct backend data - single source of truth
        email: userData.email,
        name: userData.name,
        given_name: userData.given_name || userData.first_name,
        family_name: userData.family_name || userData.last_name,
        // Also include Django's standard fields for compatibility
        first_name: userData.first_name || userData.given_name,
        last_name: userData.last_name || userData.family_name,
        // Business information - check multiple sources
        businessName: tenantData.name || userData.business_name || sessionData.business_name || sessionData.tenant_name,
        business_name: tenantData.name || userData.business_name || sessionData.business_name || sessionData.tenant_name,
        // Subscription information - prioritize session/tenant data over user model (like business name)
        subscriptionPlan: sessionData.subscription_plan || tenantData.subscription_plan || userData.subscription_plan || sessionData.selected_plan || 'free',
        subscription_plan: sessionData.subscription_plan || tenantData.subscription_plan || userData.subscription_plan || sessionData.selected_plan || 'free',
        selected_plan: sessionData.selected_plan || userData.selected_plan || tenantData.selected_plan,
        // CRITICAL: Backend's authoritative onboarding status
        needsOnboarding: sessionData.needs_onboarding,
        onboardingCompleted: sessionData.onboarding_completed || false,
        tenantId: sessionData.tenant_id || tenantData.id,
        tenant_id: sessionData.tenant_id || tenantData.id,
        // User role for RBAC - use backend role, don't override
        role: userData.role || sessionData.role || sessionData.user_role || 'USER',
        // WhatsApp Commerce preference
        show_whatsapp_commerce: userData.show_whatsapp_commerce ?? sessionData.show_whatsapp_commerce,
        country: userData.country || sessionData.country || 'US',
        // Additional metadata
        sessionSource: 'backend-direct',
        permissions: sessionData.permissions || []
      }
    });
    
      } catch (error) {
        logger.error('[Session-V2] Error:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        Sentry.captureException(error, {
          tags: { endpoint: 'session-v2-get' }
        });
        return NextResponse.json({ 
          authenticated: false,
          error: error.message
        }, { status: 500 });
      }
    }
  );
}

export async function POST(request) {
  try {
    const { accessToken, idToken, user } = await request.json();
    
    console.log('[Session-V2] Creating new session for:', user?.email);
    console.log('[Session-V2] Access token received:', accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING');
    console.log('[Session-V2] Request payload:', { hasAccessToken: !!accessToken, hasIdToken: !!idToken, hasUser: !!user });
    
    if (!accessToken) {
      console.error('[Session-V2] No access token provided in request');
      return NextResponse.json({ 
        error: 'Access token is required' 
      }, { status: 400 });
    }
    
    // Get Cloudflare headers if available
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    const origin = request.headers.get('origin') || 'https://dottapps.com';
    
    // Create session with Django backend using Auth0 token
    const authResponse = await fetch(`${API_URL}/api/sessions/create/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        // Forward Cloudflare headers if available
        ...(cfConnectingIp && { 'CF-Connecting-IP': cfConnectingIp }),
        'Origin': origin
      },
      body: JSON.stringify({ 
        // Send empty body - Django will create session from the Auth0 token
        // The serializer has defaults for all fields
      })
    });
    
    if (!authResponse.ok) {
      console.log('[Session-V2] Session creation failed:', authResponse.status);
      const errorData = await authResponse.text();
      console.log('[Session-V2] Error details:', errorData);
      return NextResponse.json({ 
        error: 'Session creation failed' 
      }, { status: 401 });
    }
    
    const sessionData = await safeJsonParse(authResponse, 'Session-V2-Create');
    console.log('[Session-V2] Backend session created:', { 
      session_token: sessionData.session_token?.substring(0, 8) + '...',
      session_token_length: sessionData.session_token?.length,
      expires_at: sessionData.expires_at,
      needs_onboarding: sessionData.needs_onboarding,
      user_email: sessionData.user?.email,
      tenant_id: sessionData.tenant?.id
    });
    
    // Set session cookie with the session token from Django
    const response = NextResponse.json({ 
      success: true,
      csrfToken: generateCSRFToken(),
      user: sessionData.user,
      tenant: sessionData.tenant,
      needs_onboarding: sessionData.needs_onboarding,
      session_token: sessionData.session_token // Include session token in response
    });
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Get the proper domain from environment or request
    let cookieDomain;
    if (isProduction) {
      // In production, use the configured domain
      cookieDomain = '.dottapps.com'; // Leading dot allows subdomains
    } else {
      // In development, don't set domain to allow localhost
      cookieDomain = undefined;
    }
    
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,  // Only secure in production
      sameSite: isProduction ? 'none' : 'lax',  // 'none' for Cloudflare compatibility in production
      expires: new Date(sessionData.expires_at),
      path: '/'
      // Don't set domain for better compatibility
    };
    
    response.cookies.set('sid', sessionData.session_token, cookieOptions);
    
    // Also set the session_token cookie for backward compatibility
    response.cookies.set('session_token', sessionData.session_token, cookieOptions);
    
    // Clear all old cookies that were causing conflicts
    const oldCookies = [
      'dott_auth_session',
      'session_pending',
      'onboarding_status',
      'appSession',
      'businessInfoCompleted',
      'onboardingStep',
      'onboardingCompleted',
      'onboardedStatus',
      'onboarding_just_completed'
    ];
    
    oldCookies.forEach(name => {
      response.cookies.delete(name);
    });
    
    console.log('[Session-V2] Session created, old cookies cleared');
    
    return response;
    
  } catch (error) {
    console.error('[Session-V2] POST error:', error);
    return NextResponse.json({ 
      error: 'Server error' 
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (sessionId) {
      // Revoke session in backend
      await fetch(`${API_URL}/api/sessions/${sessionId.value}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Session ${sessionId.value}`,
        }
      });
    }
    
    const response = NextResponse.json({ success: true });
    
    // Clear cookies with proper domain
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = isProduction ? '.dottapps.com' : undefined;
    
    const clearOptions = {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 0,
      ...(cookieDomain && { domain: cookieDomain })
    };
    
    response.cookies.set('sid', '', clearOptions);
    response.cookies.set('session_token', '', clearOptions);
    
    return response;
    
  } catch (error) {
    console.error('[Session-V2] DELETE error:', error);
    return NextResponse.json({ 
      error: 'Server error' 
    }, { status: 500 });
  }
}