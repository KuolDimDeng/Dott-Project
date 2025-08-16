import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * POST /api/payments/create-intent
 * Create a Stripe payment intent for POS credit card payment
 */
export async function POST(request) {
  console.log('[Payment Intent] === START CREATE PAYMENT INTENT ===');
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      console.error('[Payment Intent] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, currency, sale_data, customer_name } = body;

    console.log('[Payment Intent] Creating intent for:', {
      amount,
      currency,
      customer: customer_name,
      items: sale_data?.items?.length || 0
    });

    // Calculate platform fee (0.1% + $0.30)
    const platformFeePercentage = 0.001; // 0.1%
    const platformFeeFixed = 30; // 30 cents
    const platformFee = Math.round(amount * platformFeePercentage) + platformFeeFixed;

    // Prepare metadata - Stripe only accepts strings in metadata
    const metadata = {
      source: 'pos',
      platform_fee: String(platformFee),
      items_count: String(sale_data?.items?.length || 0),
      customer_name: customer_name || 'Walk-In Customer',
      // Add currency conversion info if present
      original_amount: sale_data?.original_amount ? String(sale_data.original_amount) : undefined,
      original_currency: sale_data?.original_currency || undefined,
      exchange_rate: sale_data?.exchange_rate ? String(sale_data.exchange_rate) : undefined
    };
    
    // Remove undefined values
    Object.keys(metadata).forEach(key => 
      metadata[key] === undefined && delete metadata[key]
    );

    // Call backend to create payment intent
    const response = await fetch(`${BACKEND_URL}/api/payments/create-pos-intent/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: currency || 'usd',
        platform_fee: platformFee,
        sale_data,  // Keep full sale_data for backend processing
        customer_name,
        description: `POS Sale - ${customer_name || 'Walk-In Customer'}`,
        metadata  // Use cleaned metadata for Stripe
      }),
    });

    console.log('[Payment Intent] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Payment Intent] Backend error:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to create payment intent',
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Payment Intent] Payment intent created successfully');
    console.log('[Payment Intent] === END CREATE PAYMENT INTENT ===');

    return NextResponse.json({
      client_secret: data.client_secret,
      payment_intent_id: data.payment_intent_id,
      platform_fee: platformFee
    });

  } catch (error) {
    console.error('[Payment Intent] Exception:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}