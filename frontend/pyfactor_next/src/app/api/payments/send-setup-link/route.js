import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { customer_id, customer_email, customer_name } = body;

    if (!customer_email) {
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let stripeCustomer;
    
    // First, check if customer already exists in Stripe
    const existingCustomers = await stripe.customers.list({
      email: customer_email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
    } else {
      // Create new Stripe customer
      stripeCustomer = await stripe.customers.create({
        email: customer_email,
        name: customer_name,
        metadata: {
          dott_customer_id: customer_id.toString(),
        },
      });
    }

    // Get base URL with proper scheme
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.ENVIRONMENT === 'staging' ? 'https://staging.dottapps.com' : 'https://app.dottapps.com');
    
    // Ensure URL has https:// scheme
    const appUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    
    // Create a Stripe Checkout Session for setup mode (no payment, just save card)
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: stripeCustomer.id,
      payment_method_types: ['card', 'us_bank_account'],
      success_url: `${appUrl}/dashboard/customers?setup=success&customer=${customer_id}`,
      cancel_url: `${appUrl}/dashboard/customers?setup=cancelled`,
      metadata: {
        customer_id: customer_id.toString(),
        purpose: 'payment_method_setup',
      },
    });

    // Send email with the payment setup link using Resend
    try {
      // Import Resend
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Send the email
      const emailResult = await resend.emails.send({
        from: 'Dott <noreply@dottapps.com>',
        to: customer_email,
        subject: 'Set up your payment method',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Set Up Your Payment Method</h2>
            <p>Hi ${customer_name},</p>
            <p>Please click the button below to securely add your payment method to your account:</p>
            <div style="margin: 30px 0;">
              <a href="${session.url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Add Payment Method
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${session.url}</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">This is a secure link from Stripe. Your payment information will be encrypted and stored securely.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this link, please ignore this email.</p>
          </div>
        `,
      });
      
      console.log('[Payment Setup] Email sent:', {
        customer_email,
        email_id: emailResult.data?.id,
        status: 'sent'
      });
    } catch (emailError) {
      console.error('[Payment Setup] Failed to send email:', emailError);
      // Don't fail the whole request if email fails - link is still created
    }
    
    console.log('[Payment Setup] Created setup link for customer:', {
      customer_id,
      customer_email,
      stripe_customer_id: stripeCustomer.id,
      checkout_session_id: session.id,
      setup_url: session.url,
      success_url: `${appUrl}/dashboard/customers?setup=success&customer=${customer_id}`,
      cancel_url: `${appUrl}/dashboard/customers?setup=cancelled`,
    });

    return NextResponse.json({
      success: true,
      payment_link_url: session.url,
      checkout_session_id: session.id,
      stripe_customer_id: stripeCustomer.id,
      message: 'Payment setup link sent to customer email',
    });
  } catch (error) {
    console.error('[Payment Setup] Error creating setup link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment setup link' },
      { status: 500 }
    );
  }
}