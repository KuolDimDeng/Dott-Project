import { NextResponse } from 'next/server';
import Stripe from 'stripe';
// Auth0 authentication is handled via useSession hook
import { logger } from '@/utils/logger';

// Initialize Stripe with your secret key (use environment variable in production)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51ODoxjC4RUQfzaQvfxg5vW6ROiYQx8AFhGI4Qng0VqUOYqmfHCxM9kZ7u75GF0fwgixpR7vSbT5AXpMz1OYGcWiR00lGTQRQWF';
const stripe = new Stripe(stripeSecretKey);

export async function POST(request) {
  try {
    // Get the current authenticated user
    let user;
    try {
      const session = await fetchAuthSession();
      user = await getCurrentUser();
      
      if (!session || !user) {
        return NextResponse.json(
          { error: 'Authentication required', success: false },
          { status: 401 }
        );
      }
      
      logger.debug('User authenticated for session success:', { 
        username: user.username,
        email: user.attributes?.email 
      });
    } catch (authError) {
      logger.error('Failed to authenticate user:', authError);
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Parse request body
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required', success: false },
        { status: 400 }
      );
    }
    
    logger.debug('Processing checkout session:', { sessionId });
    
    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });
    
    if (!checkoutSession) {
      return NextResponse.json(
        { error: 'Invalid checkout session', success: false },
        { status: 400 }
      );
    }
    
    logger.debug('Retrieved checkout session:', {
      id: checkoutSession.id,
      status: checkoutSession.status,
      paymentStatus: checkoutSession.payment_status,
      customer: checkoutSession.customer?.id
    });
    
    // Verify that this session belongs to the current user
    // Sometimes the client_reference_id check may not be reliable if the user's 
    // session changed between checkout creation and completion
    if (checkoutSession.client_reference_id && 
        checkoutSession.client_reference_id !== user.username) {
      
      logger.warn('Session reference ID does not match user - verifying email instead', {
        sessionClientReference: checkoutSession.client_reference_id,
        userId: user.username
      });
      
      // Fallback to email verification
      const sessionEmail = checkoutSession.customer_email;
      const userEmail = user.attributes?.email;
      
      if (sessionEmail && userEmail && sessionEmail.toLowerCase() !== userEmail.toLowerCase()) {
        logger.error('Session email does not match user email:', {
          sessionEmail,
          userEmail
        });
        
        return NextResponse.json(
          { error: 'Invalid session ownership', success: false },
          { status: 403 }
        );
      }
    }
    
    // Check if payment was successful
    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json(
        { 
          error: 'Payment not completed', 
          status: checkoutSession.payment_status,
          success: false 
        },
        { status: 400 }
      );
    }
    
    // Get the plan details from metadata
    const planId = checkoutSession.metadata?.planId || 'professional';
    const billingCycle = checkoutSession.metadata?.billingCycle || 'monthly';
    
    // Update user's subscription attributes
    try {
      const subscriptionData = {
        'custom:subscription_type': planId,
        'custom:subscription_status': 'active',
        'custom:stripe_customer_id': checkoutSession.customer?.id || '',
        'custom:stripe_subscription_id': checkoutSession.subscription?.id || '',
        'custom:subscription_updated_at': new Date().toISOString(),
        'custom:billing_cycle': billingCycle
      };
      
      logger.debug('Updating user attributes with:', subscriptionData);
      
      await updateUserAttributes(subscriptionData);
      
      logger.info('User subscription updated after successful payment:', {
        userId: user.username,
        plan: planId,
        subscriptionId: checkoutSession.subscription?.id
      });
    } catch (attributeError) {
      logger.error('Failed to update user attributes:', attributeError);
      // Continue processing even if attributes update fails, but flag in response
      return NextResponse.json({
        success: true,
        warning: 'Payment successful but failed to update user profile',
        plan: planId,
        subscription: checkoutSession.subscription?.id
      });
    }

    return NextResponse.json({
      success: true,
      plan: planId,
      billingCycle: billingCycle,
      subscription: checkoutSession.subscription?.id
    });
  } catch (error) {
    logger.error('Failed to process checkout session:', error);
    
    // Check if it's a Stripe API error
    const errorMessage = error.type === 'StripeInvalidRequestError' ? 
      'Invalid checkout session. Please contact support.' : 
      (error.message || 'Failed to process checkout session');
    
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: error.statusCode || 500 }
    );
  }
} 