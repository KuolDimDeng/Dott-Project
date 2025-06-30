# Stripe Webhook Setup for Tax Filing Payments

## Overview
This document explains how to configure Stripe webhooks for the tax filing payment system.

## Webhook URL
Production: `https://api.dottapps.com/api/payments/webhooks/stripe/tax-filing/`

## Required Stripe Events
Configure the following events in your Stripe Dashboard:
- `checkout.session.completed` - Triggered when payment is successful
- `checkout.session.expired` - Triggered when payment session expires
- `payment_intent.payment_failed` - Triggered when payment fails

## Setup Instructions

1. **Log into Stripe Dashboard**
   - Go to https://dashboard.stripe.com
   - Navigate to Developers > Webhooks

2. **Add Endpoint**
   - Click "Add endpoint"
   - Enter the webhook URL: `https://api.dottapps.com/api/payments/webhooks/stripe/tax-filing/`
   - Select the three events listed above

3. **Get Webhook Secret**
   - After creating the endpoint, click on it
   - Copy the "Signing secret" (starts with `whsec_`)
   - Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Environment Variables Required
```bash
# Stripe API keys
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Testing Webhooks Locally
Use Stripe CLI for local testing:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8000/api/payments/webhooks/stripe/tax-filing/

# Test specific events
stripe trigger checkout.session.completed
```

## Webhook Handler Features

### Successful Payment (`checkout.session.completed`)
- Updates TaxFiling payment_status to 'completed'
- Sets payment_completed_at timestamp
- Changes filing status to 'documents_pending'
- Creates status history record
- Sends confirmation email (when email service is configured)

### Expired Session (`checkout.session.expired`)
- Adds note to filing about expired session
- Keeps filing in 'payment_pending' status

### Failed Payment (`payment_intent.payment_failed`)
- Adds note to filing with failure reason
- Sends failure notification email (when configured)

## Security Features
- Webhook signature verification
- CSRF exemption for webhook endpoint only
- Idempotent processing (won't double-process payments)
- Comprehensive logging for audit trail

## API Endpoints for Payment Management

### Create Payment Session
```
POST /api/taxes/payment/create-session/
{
    "filing_id": "uuid",
    "success_url": "https://dottapps.com/taxes/payment-success",
    "cancel_url": "https://dottapps.com/taxes/payment-cancel"
}
```

### Get Pricing
```
GET /api/taxes/payment/pricing/?tax_type=sales&service_type=fullService&locations=5
```

### Validate Payment Session
```
POST /api/taxes/payment/validate-session/
{
    "session_id": "cs_test_..."
}
```

### Cancel Payment Session
```
POST /api/taxes/payment/cancel-session/
{
    "filing_id": "uuid"
}
```

## Troubleshooting

### Common Issues
1. **Webhook signature verification failed**
   - Ensure STRIPE_WEBHOOK_SECRET is correctly set
   - Check that you're using the correct environment (test vs live)

2. **Filing not found**
   - Verify filing_id is included in checkout session metadata
   - Check tenant isolation is working correctly

3. **Payment already processed**
   - This is expected behavior - webhook handler is idempotent
   - Check FilingStatusHistory for processing details

### Logging
All webhook events are logged with:
- Event type and ID
- Processing status
- Any errors encountered

Check Django logs for detailed information:
```python
logger = logging.getLogger('payments.webhook_handlers')
```