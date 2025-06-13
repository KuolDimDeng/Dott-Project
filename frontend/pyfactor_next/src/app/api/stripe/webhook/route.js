import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { logger } from '@/utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature');

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(subscription) {
  const { customer, metadata, status, current_period_end } = subscription;
  
  // Get user ID from metadata
  const userId = metadata.userId;
  if (!userId) {
    logger.warn('No userId in subscription metadata');
    return;
  }

  // Update subscription status via backend API
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/update-subscription-status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.WEBHOOK_INTERNAL_SECRET || 'webhook-secret',
      },
      body: JSON.stringify({
        user_id: userId,
        subscription_status: status,
        subscription_end_date: new Date(current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      logger.error('Failed to update subscription status in backend');
    }
  } catch (error) {
    logger.error('Error updating subscription:', error);
  }

  logger.info('Subscription updated:', { userId, status });
}

async function handleSubscriptionCancellation(subscription) {
  const { metadata, status } = subscription;
  const userId = metadata.userId;
  
  if (!userId) return;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/update-subscription-status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.WEBHOOK_INTERNAL_SECRET || 'webhook-secret',
      },
      body: JSON.stringify({
        user_id: userId,
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      logger.error('Failed to cancel subscription in backend');
    }
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
  }

  logger.info('Subscription cancelled:', { userId });
}

async function handlePaymentSuccess(invoice) {
  const { customer_email, subscription, metadata } = invoice;
  
  logger.info('Payment succeeded:', {
    email: customer_email,
    subscription,
    amount: invoice.amount_paid / 100,
  });
}

async function handlePaymentFailure(invoice) {
  const { customer_email, subscription, metadata } = invoice;
  
  logger.warn('Payment failed:', {
    email: customer_email,
    subscription,
    amount: invoice.amount_due / 100,
  });
  
  // You might want to send an email notification here
}