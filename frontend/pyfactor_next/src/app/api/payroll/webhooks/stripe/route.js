import { headers } from 'next/headers';

/**
 * Stripe webhook handler for payroll events
 * This endpoint receives webhooks from Stripe and forwards them to Django
 */
export async function POST(request) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');
    
    if (!signature) {
      return Response.json({ error: 'No signature provided' }, { status: 400 });
    }
    
    // Forward the webhook to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/payroll/webhooks/stripe/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature,
      },
      body: body,
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend webhook error:', response.status, errorData);
      return Response.json(
        { error: errorData || 'Webhook processing failed' },
        { status: response.status }
      );
    }
    
    return Response.json({ received: true });
    
  } catch (error) {
    console.error('Webhook proxy error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}