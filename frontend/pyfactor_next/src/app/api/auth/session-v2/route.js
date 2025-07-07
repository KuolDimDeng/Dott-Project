import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCSRFToken } from '@/utils/csrf';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/utils/logger';

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
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid') || cookieStore.get('session_token');
    
        if (!sessionId) {
          logger.info('[Session-V2] No session ID found');
      // Return unauthenticated response
      return NextResponse.json({ 
        authenticated: false
      }, { status: 401 });
    }
    
        logger.info('[Session-V2] Found session ID, validating with backend...', {
          sessionId: sessionId.value.substring(0, 8) + '...',
          cookieName: sessionId.name
        });
        
        // Fetch session from backend - single source of truth
        // Use the validate endpoint which is designed for session validation
        const startTime = Date.now();
        let response;
        try {
          response = await fetch(`${API_URL}/api/sessions/validate/${sessionId.value}/`, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
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
        logger.api('GET', `${API_URL}/api/sessions/validate/${sessionId.value}/`, response.status, duration);
        
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
          
      // Clear invalid session
      const res = NextResponse.json({ 
        authenticated: false,
        error: errorDetails
      }, { status: 401 });
      res.cookies.delete('sid');
      return res;
    }
    
    let sessionData;
    try {
      sessionData = await response.json();
      console.log('[Session-V2] Full backend response:', JSON.stringify(sessionData, null, 2));
    } catch (parseError) {
      logger.error('[Session-V2] Failed to parse response JSON:', {
        error: parseError.message,
        responseStatus: response.status,
        responseHeaders: Object.fromEntries(response.headers)
      });
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
        // User role for RBAC - fixed to properly read from backend
        role: userData.role || sessionData.role || sessionData.user_role || 'USER',
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
    
    const sessionData = await authResponse.json();
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
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',  // Use 'lax' for better compatibility with Cloudflare
      expires: new Date(sessionData.expires_at),
      path: '/'
      // Don't set domain to allow it to default to current domain
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
    const cookieStore = await cookies();
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
    response.cookies.delete('sid');
    return response;
    
  } catch (error) {
    console.error('[Session-V2] DELETE error:', error);
    return NextResponse.json({ 
      error: 'Server error' 
    }, { status: 500 });
  }
}