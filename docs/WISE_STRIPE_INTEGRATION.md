# Wise/Stripe Banking Integration Documentation
*Last Updated: 2025-08-06*

## Overview

This document describes the complete payment settlement system that enables users in non-Plaid countries to receive payments from their customers via Wise transfers.

## Architecture

### Payment Flow
```
Customer Credit Card → Stripe → Platform Account → Settlement Queue → Wise Transfer → User Bank Account
```

### Fee Structure
- **Stripe Fee**: 2.9% + $0.30 (platform pays)
- **Platform Fee**: 0.1% + $0.30 (platform profit)
- **Wise Transfer Fee**: Variable by country (user pays)

Example: $100 payment
- Customer pays: $100.00
- Stripe takes: $3.20
- Platform takes: $0.40
- Amount to transfer: $96.40
- Wise fee: ~$2.50 (user pays)
- User receives: ~$93.90

## Implementation Components

### 1. Backend Models

#### WiseItem Model (`banking/models.py`)
Stores bank account information securely:
- Only last 4 digits stored locally
- Full account details stored in Stripe Connect
- Fields: bank_name, country, account_holder_name, currency
- Stripe references: stripe_external_account_id, stripe_bank_account_token

#### PaymentSettlement Model (`banking/models.py`)
Tracks payments needing settlement:
- Links Stripe payment to user
- Calculates all fees
- Tracks settlement status (pending/processing/completed/failed)
- Stores transfer IDs from Wise

### 2. Security Architecture

**Bank Details Storage**:
- Sensitive data (account numbers, routing numbers) stored in Stripe Connect
- Only last 4 digits kept in database for display
- PCI-compliant storage via Stripe's infrastructure
- Bank details tokenized before storage

**API Services**:
- `stripe_bank_service.py`: Handles secure bank storage in Stripe
- `wise_service.py`: Manages Wise transfers and quotes

### 3. API Endpoints

```
/api/banking/method/              - Determines Plaid vs Wise for user's country
/api/banking/wise/setup/          - Store bank details securely
/api/banking/wise/account/        - Get user's Wise account info
/api/banking/wise/quote/          - Get transfer fee quote
/api/banking/settlements/         - View settlement history
/api/banking/settlements/process/ - Manually trigger settlement
```

### 4. Webhook Configuration

**Dedicated POS Settlement Webhook**:
- URL: `https://api.dottapps.com/api/payments/webhooks/stripe/pos-settlements/`
- Events: `payment_intent.succeeded`, `charge.succeeded`
- Purpose: Creates settlement records for POS transactions

**How It Works**:
1. Identifies POS payments by metadata (`source: 'pos'`, `pos_transaction_id`)
2. Creates PaymentSettlement record
3. Calculates fees automatically
4. Triggers immediate processing if amount >= $10

### 5. Settlement Processing

**Management Command**: `python manage.py process_settlements`

Options:
- `--minimum 50`: Only process settlements >= $50
- `--dry-run`: Preview without processing
- `--retry-failed`: Retry failed settlements from last 7 days
- `--user-id xxx`: Process for specific user only

**Cron Job Setup** (Render):
- Daily at 2 AM UTC: Process all pending settlements
- Weekly on Sunday: Retry failed settlements
- Uses Docker environment with same build as main service

### 6. Frontend Components

**Banking Settings Page** (`/Settings/banking/page.js`):
- Auto-detects user's country
- Shows Plaid for supported countries (US, CA, UK, EU)
- Shows Wise form for other countries
- Country-specific bank fields:
  - US: Routing + Account number
  - UK: Sort code + Account number
  - India: IFSC code + Account number
  - Europe: IBAN
  - Others: SWIFT/BIC + Account number

## Setup Instructions

### 1. Environment Variables (Required in Render)

```bash
WISE_API_TOKEN=<from Wise platform>
WISE_PROFILE_ID=<from Wise dashboard>
STRIPE_EXPRESS_ACCOUNT_ID=acct_1RkYGFC77wwa4lUB
STRIPE_WEBHOOK_SECRET=<from Stripe dashboard>
```

### 2. Database Migration

```bash
python manage.py migrate
```

This creates:
- `banking_wise_item` table
- `banking_payment_settlement` table

### 3. Stripe Webhook Setup

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://api.dottapps.com/api/payments/webhooks/stripe/pos-settlements/`
3. Select events: `payment_intent.succeeded`, `charge.succeeded`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET` env var

### 4. Render Cron Job Setup

Create new cron job in Render:
- Name: `daily-settlement-processor`
- Schedule: `0 2 * * *` (2 AM UTC daily)
- Command: `python manage.py process_settlements --minimum 10`
- Environment: Docker
- Dockerfile: `./backend/pyfactor/Dockerfile`
- Instance: Starter ($7/month)

Add all necessary environment variables from main service.

### 5. POS Integration Requirements

POS system must include metadata in Stripe payments:

```javascript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000, // $100
  currency: 'usd',
  metadata: {
    source: 'pos',           // Required
    user_id: 'user_abc123',  // Required
    pos_transaction_id: 'POS-12345',
    store_id: 'store_xyz'
  }
});
```

## Country Support

### Plaid Countries (Direct Bank Connection)
US, CA, GB, FR, ES, NL, IE, DE, IT, PL, DK, NO, SE, EE, LT, LV, PT, BE

### Wise Countries (Manual Bank Details)
All other countries (80+ supported by Wise), including:
- Africa: Nigeria, Kenya, South Africa, etc.
- Asia: India, Indonesia, Philippines, etc.
- Latin America: Brazil, Mexico, Argentina, etc.
- Middle East: UAE, Saudi Arabia, etc.

## Testing

### Manual Testing
1. Set up bank account at `/Settings/banking`
2. Create test payment with POS metadata
3. Check settlement creation: `python manage.py process_settlements --dry-run`
4. Process manually: `python manage.py process_settlements --user-id <id>`

### Monitoring
- Settlements page: `/api/banking/settlements/`
- Render logs: Check cron job execution
- Stripe dashboard: Monitor webhook deliveries

## Troubleshooting

### Common Issues

**Settlement not created**:
- Check payment has correct metadata (`source: 'pos'`, `user_id`)
- Verify user has Wise account set up
- Check webhook is configured correctly

**Transfer failed**:
- Verify Wise API credentials
- Check bank details are valid
- Ensure sufficient balance in Wise account

**Cron job not running**:
- Check Render cron job logs
- Verify environment variables are set
- Ensure Docker command is correct

### Debug Commands

```bash
# Check pending settlements
python manage.py process_settlements --dry-run

# Process specific user
python manage.py process_settlements --user-id <user_id>

# Retry failed settlements
python manage.py process_settlements --retry-failed

# Check settlement status
python manage.py shell
>>> from banking.models import PaymentSettlement
>>> PaymentSettlement.objects.filter(status='pending').count()
```

## Security Considerations

1. **Never store full bank account numbers** - Only last 4 digits
2. **Use Stripe for sensitive data** - PCI-compliant storage
3. **Verify webhook signatures** - Prevent unauthorized requests
4. **Audit all transfers** - Log every settlement attempt
5. **Rate limit API calls** - Prevent abuse
6. **Encrypt in transit** - Use HTTPS for all API calls

## Cost Analysis

### Per Transaction
- Stripe: 2.9% + $0.30
- Platform: 0.1% + $0.30 (profit)
- Wise: ~$2-5 (varies by country/amount)

### Monthly Infrastructure
- Render cron job: ~$0.25/month (5 min/day on Starter)
- Wise API: Free (pay per transfer)
- Stripe Connect: Free (pay per transaction)

### Example Revenue
1,000 transactions × $100 average:
- Platform fee revenue: $400/month
- After Stripe fees: $100/month profit

## Future Enhancements

1. **Batch transfers**: Combine multiple small payments
2. **Multi-currency support**: Handle non-USD settlements
3. **Instant settlements**: For premium users
4. **Mobile app integration**: Push notifications for settlements
5. **Advanced reporting**: Settlement analytics dashboard