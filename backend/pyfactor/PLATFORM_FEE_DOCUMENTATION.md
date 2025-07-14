# Dott Platform Fee Documentation

## Overview
Dott implements a platform fee structure on all payment transactions, collecting 2.9% + $0.60 per transaction while ensuring a minimum profit of $0.30 after Stripe's processing fees.

## Fee Structure

### Platform Fees by Transaction Type
| Transaction Type | Platform Fee | Stripe Cost | Net Profit |
|-----------------|--------------|-------------|------------|
| Invoice Payment | 2.9% + $0.60 | 2.9% + $0.30 | $0.30 |
| Vendor Payment | 2.9% + $0.60 | 2.9% + $0.30 | $0.30 |
| Payroll | 2.4% | 2.9% + $0.30 | Variable |
| Subscription | 2.5% | 2.9% + $0.30 | Variable |

### Example Calculations
For a $100 invoice:
- Invoice Amount: $100.00
- Platform Fee: $3.50 (2.9% + $0.60)
- Customer Pays: $103.50
- Business Receives: $100.00
- Dott Collects: $3.50
- Stripe Charges: $3.20
- Dott Profit: $0.30

## Technical Implementation

### 1. Stripe Connect Integration
- **Account Type**: Express Connect
- **Account ID**: `acct_1RkYGFC77wwa4lUB`
- **Business Name**: DOTT LLC KUOL DENG SOLE MBR
- **Statement Descriptor**: DOTTAPPS.COM

### 2. Backend Components

#### Fee Calculation Service
**File**: `/backend/pyfactor/payments/stripe_fees.py`
```python
PLATFORM_FEES = {
    'invoice_payment': {
        'percentage': Decimal('0.029'),  # 2.9%
        'fixed': 60,  # $0.60 in cents
        'description': '2.9% + $0.60'
    },
    'vendor_payment': {
        'percentage': Decimal('0.029'),
        'fixed': 60,
        'description': '2.9% + $0.60'
    }
}
```

#### Payment Processing Service
**File**: `/backend/pyfactor/payments/stripe_payment_service.py`
- Creates payment intents with automatic fee collection
- Uses `application_fee_amount` for platform fees
- Handles transfers to connected accounts
- Tracks all fee breakdowns in metadata

#### API Endpoints
**File**: `/backend/pyfactor/payments/api.py`
- `POST /api/payments/api/create-invoice-payment-intent/`
- `POST /api/payments/api/confirm-invoice-payment/`
- `POST /api/payments/api/create-vendor-payment/`
- `POST /api/payments/api/calculate-fees/`

### 3. Frontend Components

#### Invoice Payment Modal
**File**: `/frontend/pyfactor_next/src/components/payments/InvoicePaymentModal.js`
- Displays transparent fee breakdown
- Shows subtotal, processing fee, and total
- Integrates with Stripe Elements for secure payment
- Real-time fee calculation

### 4. Database Models

#### Payment Tracking Models
**File**: `/backend/pyfactor/payments/models.py`

1. **InvoicePayment**
   - Tracks invoice payments with platform fees
   - Links to Invoice model
   - Stores Stripe payment intent ID

2. **VendorPayment**
   - Tracks payments to vendors/suppliers
   - Records platform fees charged
   - Stores Stripe charge and transfer IDs

3. **PlatformFeeCollection**
   - Comprehensive fee analytics
   - Tracks profit per transaction
   - Indexes for reporting

## Payment Flow

### Invoice Payment Flow
1. Customer views invoice
2. Clicks "Pay Invoice"
3. Modal shows:
   - Invoice Amount: $X
   - Processing Fee: $Y (2.9% + $0.60)
   - Total: $X + $Y
4. Customer enters card details
5. Payment processed via Stripe
6. Platform fee automatically collected
7. Business receives invoice amount
8. Dott keeps platform fee

### Vendor Payment Flow
1. Business initiates vendor payment
2. System adds platform fee to amount
3. Total charged to business: Amount + Fee
4. Vendor receives original amount
5. Dott keeps platform fee

## Testing

### Test Script
**File**: `/backend/pyfactor/payments/test_platform_fees.py`
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python3 payments/test_platform_fees.py
```

### Sample API Calls
```javascript
// Calculate fees
const response = await fetch('/api/payments/api/calculate-fees/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    amount: 100.00,
    payment_type: 'invoice_payment'
  })
});

// Create payment intent
const paymentResponse = await fetch('/api/payments/api/create-invoice-payment-intent/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    invoice_id: 'invoice-uuid-here'
  })
});
```

## Revenue Analytics

### Monthly Projections
| Transaction Volume | Monthly Revenue |
|-------------------|-----------------|
| 100 transactions | $30 |
| 500 transactions | $150 |
| 1,000 transactions | $300 |
| 5,000 transactions | $1,500 |
| 10,000 transactions | $3,000 |

### Tracking Platform Revenue
```sql
-- Total platform fees collected
SELECT 
    COUNT(*) as transaction_count,
    SUM(platform_fee) as total_fees,
    SUM(platform_profit) as total_profit,
    transaction_type
FROM payments_platform_fee_collection
WHERE created_at >= '2025-01-01'
GROUP BY transaction_type;

-- Monthly revenue trend
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as transactions,
    SUM(platform_profit) as profit
FROM payments_platform_fee_collection
GROUP BY month
ORDER BY month DESC;
```

## Configuration

### Environment Variables
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
STRIPE_EXPRESS_ACCOUNT_ID=acct_1RkYGFC77wwa4lUB # Your Express account

# Fee Configuration (optional overrides)
PLATFORM_FEE_PERCENTAGE=0.029 # 2.9%
PLATFORM_FEE_FIXED=60 # 60 cents
```

### Updating Fees
To change platform fees, update the configuration in:
```python
# /backend/pyfactor/payments/stripe_fees.py
PLATFORM_FEES = {
    'invoice_payment': {
        'percentage': Decimal('0.029'),  # Change percentage here
        'fixed': 60,  # Change fixed fee here (in cents)
    }
}
```

## Security Considerations

1. **PCI Compliance**: All card data handled by Stripe
2. **Fee Transparency**: Users always see fees before payment
3. **Audit Trail**: All transactions logged with metadata
4. **Error Handling**: Failed payments don't lose fee data
5. **Idempotency**: Payment intents prevent double charges

## Deployment Checklist

- [ ] Run database migrations
- [ ] Configure Stripe API keys
- [ ] Set up Stripe webhooks
- [ ] Test payment flow in staging
- [ ] Monitor first transactions
- [ ] Set up fee revenue reporting

## Support

For issues or modifications:
1. Check payment logs in Stripe Dashboard
2. Review PlatformFeeCollection table for fee tracking
3. Use test script to verify calculations
4. Check API response metadata for debugging

## Future Enhancements

1. **Dynamic Fee Tiers**: Volume-based discounts
2. **Currency Support**: Multi-currency fee calculations
3. **Fee Waivers**: Promotional fee-free periods
4. **Advanced Analytics**: Fee revenue dashboard
5. **Payout Automation**: Automatic platform fee withdrawals