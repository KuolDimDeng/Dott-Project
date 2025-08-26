import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_SETUP;

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Webhook] Error verifying webhook signature:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Only handle setup mode sessions
        if (session.mode === 'setup') {
          console.log('[Webhook] Payment method setup completed:', {
            session_id: session.id,
            customer: session.customer,
            customer_id: session.metadata?.customer_id,
            setup_intent: session.setup_intent,
          });

          // Get the setup intent to find the payment method
          const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent);
          
          if (setupIntent.payment_method) {
            // Set as default payment method for the customer
            await stripe.customers.update(session.customer, {
              invoice_settings: {
                default_payment_method: setupIntent.payment_method,
              },
            });

            console.log('[Webhook] Payment method set as default:', setupIntent.payment_method);
          }

          // You can update your database here to track that the customer has payment methods
          // For example, update the customer record with has_payment_method: true
        }
        break;

      case 'setup_intent.succeeded':
        const setupIntent = event.data.object;
        console.log('[Webhook] Setup intent succeeded:', {
          setup_intent_id: setupIntent.id,
          payment_method: setupIntent.payment_method,
          customer: setupIntent.customer,
        });
        break;

      case 'payment_method.attached':
        const paymentMethod = event.data.object;
        console.log('[Webhook] Payment method attached to customer:', {
          payment_method_id: paymentMethod.id,
          customer: paymentMethod.customer,
          type: paymentMethod.type,
        });
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Disable body parsing, we need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};