import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    logger.info('[Stripe Invoice Checkout] Creating checkout session');
    
    // Get request body
    const body = await request.json();
    const { invoice_id, success_url, cancel_url } = body;
    
    // Forward to Django backend to create Stripe checkout session
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/stripe/create-invoice-checkout`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice_id,
        success_url,
        cancel_url,
        // Additional metadata for tracking
        payment_method_types: ['card'],
        mode: 'payment'
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      logger.error('[Stripe Invoice Checkout] Backend error:', error);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    logger.info('[Stripe Invoice Checkout] Checkout session created successfully');
    return NextResponse.json({
      checkout_url: data.url,
      session_id: data.session_id
    });
    
  } catch (error) {
    logger.error('[Stripe Invoice Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}