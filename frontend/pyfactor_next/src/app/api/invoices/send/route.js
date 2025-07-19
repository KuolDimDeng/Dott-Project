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
    logger.info('[Invoice Send API] POST request received');
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Invoice Send API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { invoice_id, method, recipient, message, payment_link, include_pdf } = body;
    
    logger.info('[Invoice Send API] Sending invoice:', {
      invoice_id,
      method,
      recipient: method === 'email' ? recipient : recipient.slice(0, 6) + '****' // Privacy
    });
    
    // Create Stripe payment session for this invoice
    const stripeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stripe/invoice-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify({
        invoice_id,
        success_url: `${payment_link}/success`,
        cancel_url: payment_link
      }),
    });
    
    if (!stripeResponse.ok) {
      logger.error('[Invoice Send API] Failed to create Stripe session');
      return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 });
    }
    
    const { payment_url } = await stripeResponse.json();
    
    // Send invoice based on method
    let sendData = {
      invoice_id,
      recipient,
      message,
      payment_url, // Stripe hosted checkout URL
      include_pdf
    };
    
    if (method === 'email') {
      // Send via email through backend
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sidCookie.value}`,
        },
        body: JSON.stringify(sendData),
      });
      
      if (!emailResponse.ok) {
        logger.error('[Invoice Send API] Failed to send email');
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
      
      logger.info('[Invoice Send API] Email sent successfully');
    }
    
    // For WhatsApp, we'll return the payment URL for the frontend to handle
    
    return NextResponse.json({
      success: true,
      payment_url,
      method,
      message: `Invoice sent successfully via ${method}`
    });
    
  } catch (error) {
    logger.error('[Invoice Send API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}