import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

// Helper function to get session cookie
async function getSessionCookie() {
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  return sidCookie;
}

export async function POST(request) {
  try {
    logger.info('[Record Payment API] POST request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Record Payment API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { 
      invoice_id, 
      payment_method, 
      amount, 
      payment_date, 
      reference, 
      notes 
    } = body;
    
    logger.info('[Record Payment API] Recording payment:', {
      invoice_id,
      payment_method,
      amount,
      payment_date
    });
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${invoice_id}/record-payment`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify({
        payment_method,
        amount,
        payment_date,
        reference,
        notes,
        // Additional fields for backend
        payment_source: 'manual', // Indicates this was manually recorded
        transaction_type: 'payment'
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      logger.error('[Record Payment API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    logger.info('[Record Payment API] Payment recorded successfully');
    
    // If this completes the invoice payment, you might want to send a receipt
    if (data.invoice_paid_in_full) {
      // Queue receipt email
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${invoice_id}/send-receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Session ${sidCookie.value}`,
          },
          body: JSON.stringify({
            payment_id: data.payment_id,
            send_to_customer: true
          }),
        });
      } catch (error) {
        logger.warn('[Record Payment API] Failed to send receipt:', error);
        // Don't fail the main request if receipt sending fails
      }
    }
    
    return NextResponse.json({
      success: true,
      payment_id: data.payment_id,
      invoice_paid_in_full: data.invoice_paid_in_full,
      remaining_balance: data.remaining_balance,
      message: 'Payment recorded successfully'
    });
    
  } catch (error) {
    logger.error('[Record Payment API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}