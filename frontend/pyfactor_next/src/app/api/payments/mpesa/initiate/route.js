import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { safeJsonParse } from '@/utils/responseParser';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid') || cookieStore.get('session_token');
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { phone, plan, billing_cycle, amount, currency, country } = body;
    
    logger.info('[MpesaInitiate] Request received:', {
      phone: phone?.substring(0, 7) + '***',
      plan,
      billing_cycle,
      amount,
      currency,
      country
    });
    
    // Validate required fields
    if (!phone || !plan || !billing_cycle) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Format phone number for M-Pesa (Kenya)
    let formattedPhone = phone.trim();
    if (country === 'Kenya' || country === 'KE') {
      // Remove any spaces or special characters
      formattedPhone = formattedPhone.replace(/\D/g, '');
      
      // Convert to international format
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
      }
    }
    
    // Call backend M-Pesa API
    const response = await fetch(`${API_URL}/api/payments/mpesa/initiate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sessionId.value}`
      },
      body: JSON.stringify({
        phone_number: formattedPhone,
        subscription_plan: plan,
        billing_cycle: billing_cycle,
        amount: amount,
        currency: currency || 'USD',
        country_code: country,
        // Include metadata for subscription
        metadata: {
          type: 'subscription',
          plan: plan,
          billing_cycle: billing_cycle
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await safeJsonParse(response, 'MpesaInitiate-Error');
      logger.error('[MpesaInitiate] Backend error:', errorData);
      
      return NextResponse.json({ 
        error: errorData.error || errorData.detail || 'M-Pesa payment initiation failed' 
      }, { status: response.status });
    }
    
    const result = await safeJsonParse(response, 'MpesaInitiate-Success');
    logger.info('[MpesaInitiate] Payment initiated successfully:', {
      reference: result.reference,
      status: result.status
    });
    
    return NextResponse.json({
      success: true,
      reference: result.reference,
      checkout_request_id: result.checkout_request_id,
      merchant_request_id: result.merchant_request_id,
      message: result.message || 'Please check your phone for the M-Pesa payment prompt'
    });
    
  } catch (error) {
    logger.error('[MpesaInitiate] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to initiate M-Pesa payment' 
    }, { status: 500 });
  }
}