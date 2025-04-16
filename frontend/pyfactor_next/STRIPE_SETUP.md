# Stripe Integration Setup

This document outlines how to set up and test the Stripe integration for the payment processing system.

## Prerequisites

- A Stripe account (you can sign up at [stripe.com](https://stripe.com))
- The Stripe CLI for local webhook testing (optional but recommended)

## Setup Steps

### 1. Obtain API Keys

1. Log in to your Stripe Dashboard
2. Go to Developers → API keys
3. Copy your publishable key and secret key
   - For testing, use the test mode keys
   - For production, you'll use the live mode keys

### 2. Update Environment Variables

Update your `.env.local` file with the following values:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

Replace the placeholder values with your actual Stripe API keys.

### 3. Setting Up Webhooks

#### Local Development

1. Install the Stripe CLI from [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Log in to your Stripe account via the CLI:
   ```
   stripe login
   ```
3. Start forwarding events to your local webhook endpoint:
   ```
   stripe listen --forward-to http://localhost:3000/api/payments/webhook
   ```
4. The CLI will output a webhook signing secret. Copy this value to your `.env.local` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

#### Production

1. In your Stripe Dashboard, go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter your production webhook URL: `https://your-domain.com/api/payments/webhook`
4. Select the events you want to receive:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. After creating the webhook, reveal and copy the signing secret
6. Add this secret to your production environment variables

## Testing

### Test Cards

You can use the following test card numbers:

- **Successful payment**: 4242 4242 4242 4242
- **Requires authentication**: 4000 0027 6000 3184
- **Payment fails**: 4000 0000 0000 0002

For all test cards:
- Use any future date for expiration
- Use any 3-digit CVC
- Use any postal code

### Testing the Integration

1. Start your development server
2. Navigate to the subscription selection page
3. Choose a paid plan
4. Complete the payment form with a test card
5. Verify the payment completes successfully
6. Check your Stripe dashboard to see the test payment

## Troubleshooting

### Common Issues

1. **Webhook verification fails**
   - Ensure the webhook secret in your `.env.local` matches the one provided by Stripe
   - Check that you're forwarding events to the correct endpoint

2. **Payment intents not being created**
   - Verify your Stripe secret key is correct
   - Check the server logs for any errors during payment intent creation

3. **Card element not appearing**
   - Ensure `@stripe/react-stripe-js` and `@stripe/stripe-js` are installed
   - Verify the publishable key is correctly set in your environment variables

### Logs and Debugging

- Check the browser console for client-side errors
- Review server logs for API endpoint errors
- Use the Stripe Dashboard to inspect payment attempts and webhook events

## Production Considerations

- Ensure proper error handling for payment failures
- Implement retry logic for failed payments
- Consider adding a payment confirmation page
- Implement proper security measures for handling payment information 