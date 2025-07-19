import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';

/**
 * Save pending payment information to the session
 * This is used to track Paystack payments that need verification after redirect
 */
export async function POST(request) {
  const requestId = Date.now().toString(36);
  
  try {
    logger.debug(`[SavePendingPayment:${requestId}] Processing save pending payment request`);
    
    // Get session ID
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid') || cookieStore.get('session_token');
    
    if (!sessionId) {
      logger.error(`[SavePendingPayment:${requestId}] No session ID found`);
      return NextResponse.json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required'
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { plan, billingCycle, paymentMethod, amount, currency, paystackUrl, reference } = body;
    
    // Validate required fields
    if (!plan || !billingCycle || !paymentMethod || !amount || !currency) {
      logger.error(`[SavePendingPayment:${requestId}] Missing required fields`, { 
        plan, 
        billingCycle, 
        paymentMethod, 
        amount, 
        currency 
      });
      return NextResponse.json({
        success: false,
        error: 'invalid_request',
        message: 'Missing required payment information'
      }, { status: 400 });
    }
    
    // Prepare pending payment data
    const pendingPaymentData = {
      plan,
      billing_cycle: billingCycle,
      payment_method: paymentMethod,
      amount,
      currency,
      paystack_url: paystackUrl,
      reference: reference,
      created_at: new Date().toISOString()
    };
    
    logger.info(`[SavePendingPayment:${requestId}] Saving pending payment to session`, {
      sessionId: sessionId.value.substring(0, 8) + '...',
      paymentData: {
        plan,
        billingCycle,
        amount,
        currency,
        paymentMethod,
        hasPaystackUrl: !!paystackUrl,
        hasReference: !!reference
      }
    });
    
    // Update session with pending payment information
    const response = await fetch(`${API_URL}/api/sessions/update/${sessionId.value}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sessionId.value}`
      },
      body: JSON.stringify({
        pending_payment: pendingPaymentData
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[SavePendingPayment:${requestId}] Failed to update session`, {
        status: response.status,
        error: errorText
      });
      
      return NextResponse.json({
        success: false,
        error: 'session_update_failed',
        message: 'Failed to save payment information to session',
        details: process.env.NODE_ENV === 'development' ? errorText : undefined
      }, { status: 500 });
    }
    
    const updatedSession = await response.json();
    logger.info(`[SavePendingPayment:${requestId}] Successfully saved pending payment to session`);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Pending payment information saved successfully',
      data: {
        plan,
        billingCycle,
        amount,
        currency,
        paymentMethod,
        reference
      }
    });
    
  } catch (error) {
    logger.error(`[SavePendingPayment:${requestId}] Error saving pending payment:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'server_error',
      message: 'Error saving pending payment information',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}