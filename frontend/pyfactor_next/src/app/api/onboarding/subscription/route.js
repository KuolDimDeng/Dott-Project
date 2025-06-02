import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

// Increased cookie expiration for onboarding (7 days)
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const COOKIE_OPTIONS = {
  path: '/',
  maxAge: COOKIE_MAX_AGE,
  httpOnly: false,
  sameSite: 'lax'
};

/**
 * Validate user authentication using our custom Auth0 session management
 */
async function validateAuthentication(request) {
  try {
    console.log('[api/onboarding/subscription] Validating authentication');
    
    // Check for session cookie first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        
        // Check if session is expired
        if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
          console.log('[api/onboarding/subscription] Session expired');
          return { 
            isAuthenticated: false, 
            error: 'Session expired',
            user: null 
          };
        }
        
        if (sessionData.user) {
          console.log('[api/onboarding/subscription] Session authenticated:', sessionData.user.email);
          return { 
            isAuthenticated: true, 
            user: sessionData.user,
            error: null 
          };
        }
      } catch (parseError) {
        console.error('[api/onboarding/subscription] Error parsing session cookie:', parseError);
      }
    }
    
    // Fallback: check for individual Auth0 cookies
    const accessTokenCookie = cookieStore.get('auth0_access_token');
    const idTokenCookie = cookieStore.get('auth0_id_token');
    
    if (accessTokenCookie || idTokenCookie) {
      console.log('[api/onboarding/subscription] Found auth token cookies');
      // Basic authenticated user object
      return { 
        isAuthenticated: true, 
        user: { email: 'authenticated-user' }, // Minimal user object
        error: null 
      };
    }
    
    console.log('[api/onboarding/subscription] No authentication found');
    return { 
      isAuthenticated: false, 
      error: 'Authentication required',
      user: null 
    };
  } catch (error) {
    console.error('[api/onboarding/subscription] Authentication error:', error);
    return { 
      isAuthenticated: false, 
      error: 'Authentication validation failed',
      user: null 
    };
  }
}

/**
 * Ensure a proper response is always returned
 */
function createSafeResponse(data, status = 200, additionalHeaders = null) {
  try {
    // Create response object with headers
    const headers = additionalHeaders || new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Cache-Control', 'no-cache, no-store');
    
    return NextResponse.json(data, { 
      status, 
      headers 
    });
  } catch (error) {
    console.error('[api/onboarding/subscription] Error creating response:', error);
    // Absolutely minimal response that should never fail
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Cache-Control', 'no-cache, no-store');
    
    return new Response(JSON.stringify({ success: false, error: 'Failed to create response' }), {
      status: 500,
      headers
    });
  }
}

/**
 * Handle subscription save - SECURE VERSION with Database Persistence
 */
export async function POST(request) {
  try {
    console.log('[api/onboarding/subscription] POST request received');
    
    // SECURITY: Validate authentication first
    const authResult = await validateAuthentication(request);
    if (!authResult.isAuthenticated) {
      console.warn('[api/onboarding/subscription] Unauthorized request blocked');
      return createSafeResponse({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to continue'
      }, 401);
    }
    
    const authenticatedUser = authResult.user;
    console.log('[api/onboarding/subscription] Authenticated user:', authenticatedUser.email);
    
    // Get request body, handling empty requests gracefully
    let data = {};
    try {
      if (request.body) {
        data = await request.json();
        console.log('[api/onboarding/subscription] Request body parsed:', { fields: Object.keys(data) });
      }
    } catch (parseError) {
      console.warn('[api/onboarding/subscription] Error parsing request body:', parseError.message);
      return createSafeResponse({
        success: false,
        error: 'Invalid request data',
        message: 'Please check your input and try again'
      }, 400);
    }
    
    // Extract and validate subscription data
    const subscriptionData = {
      selected_plan: data.selected_plan || data.plan || '',
      billing_cycle: data.billing_cycle || data.interval || 'monthly',
      payment_method: data.payment_method || null,
      current_status: data.current_status || 'subscription',
      next_status: data.next_status || (data.selected_plan === 'free' ? 'setup' : 'payment'),
      reset_onboarding: data.reset_onboarding || false,
      requires_payment: data.requires_payment || (data.selected_plan !== 'free')
    };
    
    console.log('[api/onboarding/subscription] Validated subscription data:', {
      selected_plan: subscriptionData.selected_plan,
      billing_cycle: subscriptionData.billing_cycle,
      requires_payment: subscriptionData.requires_payment
    });

    // SECURITY: Forward to Django backend with proper authentication
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
      throw new Error('API configuration missing - backend URL not configured');
    }

    try {
      // Get Auth0 access token for backend authentication
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('appSession');
      let accessToken = null;
      
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
          accessToken = sessionData.accessToken;
        } catch (parseError) {
          console.error('[api/onboarding/subscription] Error parsing session for token:', parseError);
        }
      }
      
      if (!accessToken) {
        throw new Error('No valid access token found for backend authentication');
      }
      
      console.log('[api/onboarding/subscription] Forwarding to Django backend with Auth0 token');
      
      // Forward authenticated request to Django backend
      const backendResponse = await fetch(`${apiBaseUrl}/api/onboarding/subscription/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Email': authenticatedUser.email,
          'X-Request-ID': `frontend-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          'X-Source': 'nextjs-api-route'
        },
        body: JSON.stringify(subscriptionData),
        timeout: 10000 // 10 second timeout
      });
      
      let backendData = {};
      let backendSuccess = false;
      
      if (backendResponse.ok) {
        try {
          backendData = await backendResponse.json();
          backendSuccess = true;
          console.log('[api/onboarding/subscription] Backend save successful:', {
            hasTenantId: !!backendData.tenant_id,
            success: backendData.success
          });
        } catch (jsonError) {
          console.warn('[api/onboarding/subscription] Backend response not JSON, but request succeeded');
          backendSuccess = true;
          backendData = { success: true, message: 'Subscription saved successfully' };
        }
      } else {
        const errorText = await backendResponse.text().catch(() => 'Unknown error');
        console.error('[api/onboarding/subscription] Backend save failed:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText
        });
        
        // Continue with cookie storage even if backend fails (graceful degradation)
        console.log('[api/onboarding/subscription] Continuing with cookie storage despite backend failure');
      }
      
      // ALWAYS set cookies for caching/fallback (regardless of backend success)
      try {
        // Mark subscription step as completed
        await cookieStore.set('subscriptionCompleted', 'true', COOKIE_OPTIONS);
        await cookieStore.set('onboardingStep', subscriptionData.next_status, COOKIE_OPTIONS);
        await cookieStore.set('onboardedStatus', 'subscription', COOKIE_OPTIONS);
        
        // Cache subscription data
        await cookieStore.set('subscriptionPlan', subscriptionData.selected_plan, COOKIE_OPTIONS);
        await cookieStore.set('subscriptionInterval', subscriptionData.billing_cycle, COOKIE_OPTIONS);
        
        if (subscriptionData.payment_method) {
          await cookieStore.set('paymentMethod', subscriptionData.payment_method, COOKIE_OPTIONS);
        }
        
        // Set timestamp for tracking
        await cookieStore.set('lastOnboardingUpdate', new Date().toISOString(), COOKIE_OPTIONS);
        
        console.log('[api/onboarding/subscription] Cookies set successfully');
      } catch (cookieError) {
        console.error('[api/onboarding/subscription] Error setting cookies:', cookieError);
        // Continue - don't fail the entire request for cookie issues
      }
      
      // Prepare response data
      const responseData = {
        success: backendSuccess,
        message: backendSuccess ? 'Subscription saved successfully' : 'Subscription cached locally',
        nextRoute: subscriptionData.next_status === 'setup' ? '/onboarding/setup' : '/onboarding/payment',
        subscription: {
          selected_plan: subscriptionData.selected_plan,
          billing_cycle: subscriptionData.billing_cycle,
          payment_method: subscriptionData.payment_method,
          requires_payment: subscriptionData.requires_payment
        },
        backendStatus: backendSuccess ? 'saved' : 'failed',
        tenant_id: backendData.tenant_id || null
      };
      
      // Return success response
      return createSafeResponse(responseData);
      
    } catch (backendError) {
      console.error('[api/onboarding/subscription] Backend communication failed:', {
        message: backendError.message,
        stack: backendError.stack
      });
      
      // Graceful degradation: save to cookies even if backend fails
      try {
        const cookieStore = await cookies();
        
        // Mark subscription step as completed (cached)
        await cookieStore.set('subscriptionCompleted', 'true', COOKIE_OPTIONS);
        await cookieStore.set('onboardingStep', subscriptionData.next_status, COOKIE_OPTIONS);
        await cookieStore.set('onboardedStatus', 'subscription', COOKIE_OPTIONS);
        
        // Cache subscription data
        await cookieStore.set('subscriptionPlan', subscriptionData.selected_plan, COOKIE_OPTIONS);
        await cookieStore.set('subscriptionInterval', subscriptionData.billing_cycle, COOKIE_OPTIONS);
        
        return createSafeResponse({
          success: true, // Still successful from user perspective
          message: 'Subscription saved locally (backend temporarily unavailable)',
          nextRoute: subscriptionData.next_status === 'setup' ? '/onboarding/setup' : '/onboarding/payment',
          subscription: {
            selected_plan: subscriptionData.selected_plan,
            billing_cycle: subscriptionData.billing_cycle,
            payment_method: subscriptionData.payment_method,
            requires_payment: subscriptionData.requires_payment
          },
          backendStatus: 'offline',
          fallback: true
        });
      } catch (fallbackError) {
        console.error('[api/onboarding/subscription] Complete failure:', fallbackError);
        
        return createSafeResponse({
          success: false,
          error: 'Failed to save subscription',
          message: 'Please try again or contact support if the problem persists'
        }, 500);
      }
    }
    
  } catch (error) {
    console.error('[api/onboarding/subscription] Critical error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    return createSafeResponse({
      success: false,
      error: 'Critical error processing subscription',
      message: error.message
    }, 500);
  }
}

/**
 * Get existing subscription information - SECURE VERSION
 */
export async function GET(request) {
  try {
    console.log('[api/onboarding/subscription] GET request received');
    
    // SECURITY: Validate authentication first
    const authResult = await validateAuthentication(request);
    if (!authResult.isAuthenticated) {
      console.warn('[api/onboarding/subscription] Unauthorized GET request blocked');
      return createSafeResponse({
        subscription: {},
        error: 'Authentication required',
        message: 'Please sign in to view subscription information'
      }, 401);
    }
    
    const authenticatedUser = authResult.user;
    console.log('[api/onboarding/subscription] Authenticated user for GET:', authenticatedUser.email);
    
    // Get values from cookies as fallback data source
    let cookieStore;
    try {
      cookieStore = await cookies();
      console.log('[api/onboarding/subscription] Got cookies successfully');
    } catch (cookieError) {
      console.error('[api/onboarding/subscription] Error accessing cookies:', cookieError);
      // Return empty response that won't break the client
      return createSafeResponse({
        subscription: {},
        error: 'Failed to access cookies'
      });
    }
    
    const subscriptionPlanCookie = cookieStore.get('subscriptionPlan')?.value || '';
    const subscriptionIntervalCookie = cookieStore.get('subscriptionInterval')?.value || '';
    const paymentMethodCookie = cookieStore.get('paymentMethod')?.value || '';
    
    console.log('[api/onboarding/subscription] Read cookies:', {
      hasSubscriptionPlan: !!subscriptionPlanCookie,
      hasSubscriptionInterval: !!subscriptionIntervalCookie
    });
    
    // Create a safe response
    return createSafeResponse({
      subscription: {
        selected_plan: subscriptionPlanCookie,
        billing_cycle: subscriptionIntervalCookie,
        payment_method: paymentMethodCookie
      },
      source: subscriptionPlanCookie ? 'cookies' : 'empty'
    });
  } catch (error) {
    // Log error but return a valid empty response
    console.error('[api/onboarding/subscription] GET: Error retrieving subscription:', {
      message: error.message,
      stack: error.stack
    });
    
    // Return minimal valid response that won't break the client
    return createSafeResponse({
      subscription: {},
      error: 'Failed to retrieve subscription information'
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
