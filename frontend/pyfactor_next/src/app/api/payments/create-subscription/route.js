import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { decrypt } from '@/utils/sessionEncryption';
import { checkRateLimit, rateLimitResponse } from '@/middleware/rateLimit';
import { csrfProtection } from '@/utils/csrf';

/**
 * Backend proxy for Stripe subscription creation
 * This handles authentication server-side, keeping tokens secure
 */
export async function POST(request) {
  // Check rate limit first
  const rateLimitResult = checkRateLimit(request, 'payment');
  if (rateLimitResult.limited) {
    return rateLimitResponse(rateLimitResult);
  }

  // Validate CSRF token
  const csrfResult = csrfProtection(request);
  if (!csrfResult.valid) {
    return NextResponse.json({ 
      error: csrfResult.error 
    }, { status: 403 });
  }

  try {
    // Get session from secure cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Parse and decrypt secure session
    let sessionData;
    try {
      // Try to decrypt first (new format)
      try {
        const decrypted = decrypt(sessionCookie.value);
        sessionData = JSON.parse(decrypted);
      } catch (decryptError) {
        // Fallback to old base64 format for backward compatibility
        logger.warn('[CreateSubscription] Using legacy session format');
        sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      }
    } catch (error) {
      logger.error('[CreateSubscription] Invalid session:', error);
      return NextResponse.json({ 
        error: 'Invalid session' 
      }, { status: 401 });
    }
    
    // Validate session
    if (!sessionData.accessToken || !sessionData.user) {
      return NextResponse.json({ 
        error: 'Invalid session data' 
      }, { status: 401 });
    }
    
    // Check expiration
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      return NextResponse.json({ 
        error: 'Session expired' 
      }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { payment_method_id, plan, billing_cycle } = body;
    
    // Validate input
    if (!payment_method_id || !plan || !billing_cycle) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Validate plan and billing cycle values
    const validPlans = ['free', 'professional', 'enterprise'];
    const validBillingCycles = ['monthly', 'yearly'];
    
    if (!validPlans.includes(plan.toLowerCase())) {
      return NextResponse.json({ 
        error: 'Invalid plan' 
      }, { status: 400 });
    }
    
    if (!validBillingCycles.includes(billing_cycle.toLowerCase())) {
      return NextResponse.json({ 
        error: 'Invalid billing cycle' 
      }, { status: 400 });
    }
    
    logger.info('[CreateSubscription] Processing subscription:', {
      user: sessionData.user.email,
      plan: plan,
      billing_cycle: billing_cycle
    });
    
    // Forward to backend API with authentication
    const backendUrl = process.env.BACKEND_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/payments/create-subscription/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.accessToken}`,
        'X-User-Email': sessionData.user.email,
        'X-Request-ID': crypto.randomUUID()
      },
      body: JSON.stringify({
        payment_method_id,
        plan: plan.toLowerCase(),
        billing_cycle: billing_cycle.toLowerCase()
      })
    });
    
    // Get response
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      logger.error('[CreateSubscription] Invalid backend response:', responseText);
      return NextResponse.json({ 
        error: 'Invalid response from payment server' 
      }, { status: 502 });
    }
    
    // Log response for debugging
    logger.info('[CreateSubscription] Backend response:', {
      status: response.status,
      ok: response.ok,
      data: responseData
    });
    
    // Handle errors
    if (!response.ok) {
      logger.error('[CreateSubscription] Backend error:', {
        status: response.status,
        error: responseData
      });
      
      // Return appropriate error to client
      return NextResponse.json({ 
        error: responseData.error || responseData.detail || 'Subscription creation failed',
        requiresAction: responseData.requiresAction,
        clientSecret: responseData.clientSecret
      }, { status: response.status });
    }
    
    // Success - return subscription data
    return NextResponse.json({
      success: true,
      subscription: responseData.subscription,
      requiresAction: responseData.requiresAction,
      clientSecret: responseData.clientSecret
    });
    
  } catch (error) {
    logger.error('[CreateSubscription] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}