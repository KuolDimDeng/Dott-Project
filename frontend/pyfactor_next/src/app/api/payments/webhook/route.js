import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { logger } from '@/utils/logger';
import { updateUserAttributes } from 'aws-amplify/auth';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  const requestId = Date.now().toString(36);
  
  try {
    // Get the raw request body for signature verification
    const rawBody = await request.text();
    
    // Get the Stripe signature from headers
    const headersList = headers();
    const signature = headersList.get('stripe-signature');
    
    if (!signature) {
      logger.error(`[StripeWebhook:${requestId}] Missing Stripe signature`);
      return NextResponse.json({
        success: false,
        error: 'missing_signature',
        message: 'Stripe signature is required'
      }, { status: 400 });
    }
    
    // Verify the event
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (err) {
      logger.error(`[StripeWebhook:${requestId}] Webhook signature verification failed:`, err);
      return NextResponse.json({
        success: false,
        error: 'invalid_signature',
        message: `Webhook signature verification failed: ${err.message}`
      }, { status: 400 });
    }
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const userId = paymentIntent.metadata.userId;
        const plan = paymentIntent.metadata.plan;
        const billingCycle = paymentIntent.metadata.billingCycle;
        
        logger.info(`[StripeWebhook:${requestId}] Payment succeeded:`, {
          paymentIntentId: paymentIntent.id,
          userId,
          plan,
          billingCycle
        });
        
        if (userId) {
          try {
            // Update user attributes to reflect successful payment
            await updateUserAttributes({
              userAttributes: {
                'custom:paymentid': paymentIntent.id,
                'custom:payverified': 'true',
                'custom:subplan': plan,
                'custom:subinterval': billingCycle,
                'custom:subprice': (paymentIntent.amount / 100).toString(),
                'custom:subscriptionstatus': 'active',
                'custom:updated_at': new Date().toISOString()
              }
            });
            
            logger.info(`[StripeWebhook:${requestId}] User attributes updated for ${userId}`);
          } catch (updateError) {
            logger.error(`[StripeWebhook:${requestId}] Error updating user attributes:`, updateError);
          }
        }
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        logger.warn(`[StripeWebhook:${requestId}] Payment failed:`, {
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message
        });
        break;
      }
      
      default:
        logger.debug(`[StripeWebhook:${requestId}] Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error(`[StripeWebhook:${requestId}] Webhook error:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'webhook_error',
      message: 'Webhook processing error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 