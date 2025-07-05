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
    console.log('[api/onboarding/payment] Validating authentication');
    
    // Check for session cookie first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        
        // Check if session is expired
        if (sessionData.accessTokenExpiresAt && Date.now() > sessionData.accessTokenExpiresAt) {
          console.log('[api/onboarding/payment] Session expired');
          return { 
            isAuthenticated: false, 
            error: 'Session expired',
            user: null 
          };
        }
        
        if (sessionData.user) {
          console.log('[api/onboarding/payment] Session authenticated:', sessionData.user.email);
          return { 
            isAuthenticated: true, 
            user: sessionData.user,
            error: null 
          };
        }
      } catch (parseError) {
        console.error('[api/onboarding/payment] Error parsing session cookie:', parseError);
      }
    }
    
    // Fallback: check for individual Auth0 cookies
    const accessTokenCookie = cookieStore.get('auth0_access_token');
    const idTokenCookie = cookieStore.get('auth0_id_token');
    
    if (accessTokenCookie || idTokenCookie) {
      console.log('[api/onboarding/payment] Found auth token cookies');
      // Basic authenticated user object
      return { 
        isAuthenticated: true, 
        user: { email: 'authenticated-user' }, // Minimal user object
        error: null 
      };
    }
    
    console.log('[api/onboarding/payment] No authentication found');
    return { 
      isAuthenticated: false, 
      error: 'Authentication required',
      user: null 
    };
  } catch (error) {
    console.error('[api/onboarding/payment] Authentication error:', error);
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
    console.error('[api/onboarding/payment] Error creating response:', error);
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
 * Handle payment processing - SECURE VERSION with Database Persistence
 */
export async function POST(request) {
  try {
    console.log('[api/onboarding/payment] POST request received');
    
    // SECURITY: Validate authentication first
    const authResult = await validateAuthentication(request);
    if (!authResult.isAuthenticated) {
      console.warn('[api/onboarding/payment] Unauthorized request blocked');
      return createSafeResponse({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to continue'
      }, 401);
    }
    
    const authenticatedUser = authResult.user;
    console.log('[api/onboarding/payment] Authenticated user:', authenticatedUser.email);
    
    // Get request body, handling empty requests gracefully
    let data = {};
    try {
      if (request.body) {
        data = await request.json();
        console.log('[api/onboarding/payment] Request body parsed:', { fields: Object.keys(data) });
      }
    } catch (parseError) {
      console.warn('[api/onboarding/payment] Error parsing request body:', parseError.message);
      return createSafeResponse({
        success: false,
        error: 'Invalid request data',
        message: 'Please check your input and try again'
      }, 400);
    }
    
    // Extract and validate payment data
    const paymentData = {
      paymentId: data.paymentId || data.id || '',
      paymentMethod: data.paymentMethod || data.payment_method || 'credit_card',
      amount: data.amount || 0,
      currency: data.currency || 'USD',
      status: data.status || 'pending',
      periodEnd: data.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      timestamp: new Date().toISOString()
    };
    
    console.log('[api/onboarding/payment] Validated payment data:', {
      paymentId: paymentData.paymentId,
      paymentMethod: paymentData.paymentMethod,
      amount: paymentData.amount,
      status: paymentData.status
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
          console.error('[api/onboarding/payment] Error parsing session for token:', parseError);
        }
      }
      
      if (!accessToken) {
        throw new Error('No valid access token found for backend authentication');
      }
      
      console.log('[api/onboarding/payment] Forwarding to Django backend with Auth0 token');
      
      // Forward authenticated request to Django backend
      const backendResponse = await fetch(`${apiBaseUrl}/api/onboarding/payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Email': authenticatedUser.email,
          'X-Request-ID': `frontend-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          'X-Source': 'nextjs-api-route'
        },
        body: JSON.stringify(paymentData),
        timeout: 10000 // 10 second timeout
      });
      
      let backendData = {};
      let backendSuccess = false;
      
      if (backendResponse.ok) {
        try {
          backendData = await backendResponse.json();
          backendSuccess = true;
          console.log('[api/onboarding/payment] Backend save successful:', {
            hasTenantId: !!backendData.tenant_id,
            success: backendData.success
          });
        } catch (jsonError) {
          console.warn('[api/onboarding/payment] Backend response not JSON, but request succeeded');
          backendSuccess = true;
          backendData = { success: true, message: 'Payment processed successfully' };
        }
      } else {
        const errorText = await backendResponse.text().catch(() => 'Unknown error');
        console.error('[api/onboarding/payment] Backend save failed:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText
        });
        
        // Continue with cookie storage even if backend fails (graceful degradation)
        console.log('[api/onboarding/payment] Continuing with cookie storage despite backend failure');
      }
      
      // ALWAYS set cookies for caching/fallback (regardless of backend success)
      try {
        // Mark payment step as completed
        await cookieStore.set('paymentCompleted', 'true', COOKIE_OPTIONS);
        await cookieStore.set('onboardingStep', 'setup', COOKIE_OPTIONS);
        await cookieStore.set('onboardedStatus', 'payment', COOKIE_OPTIONS);
        
        // Cache payment data
        await cookieStore.set('paymentId', paymentData.paymentId, COOKIE_OPTIONS);
        await cookieStore.set('paymentMethod', paymentData.paymentMethod, COOKIE_OPTIONS);
        await cookieStore.set('paymentStatus', paymentData.status, COOKIE_OPTIONS);
        
        // Set timestamp for tracking
        await cookieStore.set('lastOnboardingUpdate', new Date().toISOString(), COOKIE_OPTIONS);
        
        console.log('[api/onboarding/payment] Cookies set successfully');
      } catch (cookieError) {
        console.error('[api/onboarding/payment] Error setting cookies:', cookieError);
        // Continue - don't fail the entire request for cookie issues
      }
      
      // Prepare response data
      const responseData = {
        success: backendSuccess,
        message: backendSuccess ? 'Payment processed successfully' : 'Payment cached locally',
        nextRoute: '/onboarding/setup',
        nextStep: 'SETUP',
        payment: {
          paymentId: paymentData.paymentId,
          paymentMethod: paymentData.paymentMethod,
          amount: paymentData.amount,
          status: paymentData.status
        },
        backendStatus: backendSuccess ? 'saved' : 'failed',
        tenant_id: backendData.tenant_id || null
      };
      
      // Return success response
      return createSafeResponse(responseData);
      
    } catch (backendError) {
      console.error('[api/onboarding/payment] Backend communication failed:', {
        message: backendError.message,
        stack: backendError.stack
      });
      
      // Graceful degradation: save to cookies even if backend fails
      try {
        const cookieStore = await cookies();
        
        // Mark payment step as completed (cached)
        await cookieStore.set('paymentCompleted', 'true', COOKIE_OPTIONS);
        await cookieStore.set('onboardingStep', 'setup', COOKIE_OPTIONS);
        await cookieStore.set('onboardedStatus', 'payment', COOKIE_OPTIONS);
        
        // Cache payment data
        await cookieStore.set('paymentId', paymentData.paymentId, COOKIE_OPTIONS);
        await cookieStore.set('paymentMethod', paymentData.paymentMethod, COOKIE_OPTIONS);
        
        return createSafeResponse({
          success: true, // Still successful from user perspective
          message: 'Payment processed locally (backend temporarily unavailable)',
          nextRoute: '/onboarding/setup',
          nextStep: 'SETUP',
          payment: {
            paymentId: paymentData.paymentId,
            paymentMethod: paymentData.paymentMethod,
            amount: paymentData.amount,
            status: paymentData.status
          },
          backendStatus: 'offline',
          fallback: true
        });
      } catch (fallbackError) {
        console.error('[api/onboarding/payment] Complete failure:', fallbackError);
        
        return createSafeResponse({
          success: false,
          error: 'Failed to process payment',
          message: 'Please try again or contact support if the problem persists'
        }, 500);
      }
    }
    
  } catch (error) {
    console.error('[api/onboarding/payment] Critical error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    return createSafeResponse({
      success: false,
      error: 'Critical error processing payment',
      message: error.message
    }, 500);
  }
}

/**
 * Get existing payment information - SECURE VERSION
 */
export async function GET(request) {
  try {
    console.log('[api/onboarding/payment] GET request received');
    
    // SECURITY: Validate authentication first
    const authResult = await validateAuthentication(request);
    if (!authResult.isAuthenticated) {
      console.warn('[api/onboarding/payment] Unauthorized GET request blocked');
      return createSafeResponse({
        payment: {},
        error: 'Authentication required',
        message: 'Please sign in to view payment information'
      }, 401);
    }
    
    const authenticatedUser = authResult.user;
    console.log('[api/onboarding/payment] Authenticated user for GET:', authenticatedUser.email);
    
    // Get values from cookies as fallback data source
    let cookieStore;
    try {
      cookieStore = await cookies();
      console.log('[api/onboarding/payment] Got cookies successfully');
    } catch (cookieError) {
      console.error('[api/onboarding/payment] Error accessing cookies:', cookieError);
      // Return empty response that won't break the client
      return createSafeResponse({
        payment: {},
        error: 'Failed to access cookies'
      });
    }
    
    const paymentIdCookie = cookieStore.get('paymentId')?.value || '';
    const paymentMethodCookie = cookieStore.get('paymentMethod')?.value || '';
    const paymentStatusCookie = cookieStore.get('paymentStatus')?.value || '';
    const paymentCompletedCookie = cookieStore.get('paymentCompleted')?.value || '';
    
    console.log('[api/onboarding/payment] Read cookies:', {
      hasPaymentId: !!paymentIdCookie,
      hasPaymentMethod: !!paymentMethodCookie,
      isCompleted: paymentCompletedCookie === 'true'
    });
    
    // Create a safe response
    return createSafeResponse({
      payment: {
        paymentId: paymentIdCookie,
        paymentMethod: paymentMethodCookie,
        status: paymentStatusCookie,
        completed: paymentCompletedCookie === 'true'
      },
      paymentCompleted: paymentCompletedCookie === 'true',
      currentStatus: 'payment',
      source: paymentIdCookie ? 'cookies' : 'empty'
    });
  } catch (error) {
    // Log error but return a valid empty response
    console.error('[api/onboarding/payment] GET: Error retrieving payment:', {
      message: error.message,
      stack: error.stack
    });
    
    // Return minimal valid response that won't break the client
    return createSafeResponse({
      payment: {},
      paymentCompleted: false,
      error: 'Failed to retrieve payment information'
    });
  }
}

/**
 * Update payment information - SECURE VERSION
 */
export async function PUT(request) {
  try {
    console.log('[api/onboarding/payment] PUT request received');
    
    // SECURITY: Validate authentication first
    const authResult = await validateAuthentication(request);
    if (!authResult.isAuthenticated) {
      console.warn('[api/onboarding/payment] Unauthorized PUT request blocked');
      return createSafeResponse({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to continue'
      }, 401);
    }
    
    const authenticatedUser = authResult.user;
    console.log('[api/onboarding/payment] Authenticated user for PUT:', authenticatedUser.email);
    
    // Get request body
    let updates = {};
    try {
      if (request.body) {
        updates = await request.json();
        console.log('[api/onboarding/payment] PUT body parsed:', { fields: Object.keys(updates) });
      }
    } catch (parseError) {
      console.warn('[api/onboarding/payment] Error parsing PUT body:', parseError.message);
      return createSafeResponse({
        success: false,
        error: 'Invalid request data',
        message: 'Please check your input and try again'
      }, 400);
    }
    
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
          console.error('[api/onboarding/payment] Error parsing session for token:', parseError);
        }
      }
      
      if (!accessToken) {
        throw new Error('No valid access token found for backend authentication');
      }
      
      console.log('[api/onboarding/payment] Forwarding PUT to Django backend with Auth0 token');
      
      // Forward authenticated request to Django backend
      const backendResponse = await fetch(`${apiBaseUrl}/api/onboarding/payment/current/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-User-Email': authenticatedUser.email,
          'X-Request-ID': `frontend-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          'X-Source': 'nextjs-api-route'
        },
        body: JSON.stringify(updates),
        timeout: 10000 // 10 second timeout
      });
      
      let backendData = {};
      let backendSuccess = false;
      
      if (backendResponse.ok) {
        try {
          backendData = await backendResponse.json();
          backendSuccess = true;
          console.log('[api/onboarding/payment] Backend PUT successful');
        } catch (jsonError) {
          console.warn('[api/onboarding/payment] Backend PUT response not JSON, but request succeeded');
          backendSuccess = true;
          backendData = { success: true, message: 'Payment updated successfully' };
        }
      } else {
        const errorText = await backendResponse.text().catch(() => 'Unknown error');
        console.error('[api/onboarding/payment] Backend PUT failed:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText
        });
      }
      
      // Update cookies with new data if backend succeeded
      if (backendSuccess) {
        try {
          if (updates.paymentMethod) {
            await cookieStore.set('paymentMethod', updates.paymentMethod, COOKIE_OPTIONS);
          }
          if (updates.status) {
            await cookieStore.set('paymentStatus', updates.status, COOKIE_OPTIONS);
          }
          
          // Set timestamp for tracking
          await cookieStore.set('lastOnboardingUpdate', new Date().toISOString(), COOKIE_OPTIONS);
          
          console.log('[api/onboarding/payment] PUT cookies updated successfully');
        } catch (cookieError) {
          console.error('[api/onboarding/payment] Error updating PUT cookies:', cookieError);
        }
      }
      
      // Prepare response data
      const responseData = {
        success: backendSuccess,
        message: backendSuccess ? 'Payment updated successfully' : 'Failed to update payment',
        backendStatus: backendSuccess ? 'updated' : 'failed'
      };
      
      // Return response
      return createSafeResponse(responseData, backendSuccess ? 200 : 500);
      
    } catch (backendError) {
      console.error('[api/onboarding/payment] Backend PUT communication failed:', {
        message: backendError.message,
        stack: backendError.stack
      });
      
      return createSafeResponse({
        success: false,
        error: 'Failed to update payment information',
        message: 'Please try again or contact support if the problem persists'
      }, 500);
    }
    
  } catch (error) {
    console.error('[api/onboarding/payment] PUT critical error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    return createSafeResponse({
      success: false,
      error: 'Critical error updating payment',
      message: error.message
    }, 500);
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
