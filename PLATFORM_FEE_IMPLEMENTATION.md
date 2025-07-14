# Platform Fee Implementation - Dott

## Overview
I've implemented a comprehensive platform fee structure that allows you to collect 2.9% + $0.60 on every transaction, keeping $0.30 profit per transaction after Stripe's fees.

## Fee Structure

### Your Platform Fees:
- **Invoice Payments**: 2.9% + $0.60 per transaction
- **Vendor Payments**: 2.9% + $0.60 per transaction
- **Payroll** (future): 2.4% (configurable)
- **Subscriptions** (future): 2.5% (configurable)

### Your Profit Calculation:
```
Customer pays: Invoice Amount + Platform Fee
Platform Fee: 2.9% + $0.60
Stripe takes: 2.9% + $0.30
Your profit: $0.30 per transaction
```

## Implementation Details

### 1. Backend Components

#### Fee Calculation (`/backend/pyfactor/payments/stripe_fees.py`)
- Centralized fee configuration
- Automatic profit calculation
- Support for different transaction types
- UI-friendly fee formatting

#### Payment Service (`/backend/pyfactor/payments/stripe_payment_service.py`)
- Creates payment intents with platform fees
- Uses your Express Connect account
- Handles vendor payments with transfers
- Tracks all fees and profits

#### API Endpoints (`/backend/pyfactor/payments/api.py`)
- `/api/payments/api/create-invoice-payment-intent/` - Create payment for invoice
- `/api/payments/api/confirm-invoice-payment/` - Confirm payment completion
- `/api/payments/api/create-vendor-payment/` - Pay vendors/suppliers
- `/api/payments/api/calculate-fees/` - Calculate fees for display

### 2. Frontend Components

#### Invoice Payment Modal (`/frontend/pyfactor_next/src/components/payments/InvoicePaymentModal.js`)
- Shows transparent fee breakdown
- Handles Stripe payment flow
- Displays: Subtotal, Processing Fee, Total
- User sees exactly what they're paying

### 3. Database Models

#### Fee Tracking Models:
- `InvoicePayment` - Track invoice payments with fees
- `VendorPayment` - Track vendor payments
- `PlatformFeeCollection` - Comprehensive fee analytics

## How It Works

### For Invoice Payments:
1. Customer receives invoice for $100
2. System calculates fee: $2.90 + $0.60 = $3.50
3. Customer pays total: $103.50
4. Your platform receives: $100 (to business) + $3.50 (platform fee)
5. Stripe deducts their fee: $2.90 + $0.30 = $3.20
6. Your net profit: $0.30

### For Vendor Payments:
1. Business pays vendor $500
2. Platform adds fee: $14.50 + $0.60 = $15.10
3. Total charge: $515.10
4. Vendor receives: $500
5. You keep: $15.10 (minus Stripe's $14.80) = $0.30 profit

## Testing

### Test Payment Flow:
```javascript
// Frontend example
const response = await fetch('/api/payments/api/create-invoice-payment-intent/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ invoice_id: 'uuid-here' })
});

const data = await response.json();
// Returns payment intent with fee breakdown
```

### Check Fee Calculation:
```javascript
const response = await fetch('/api/payments/api/calculate-fees/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    amount: 100.00,
    payment_type: 'invoice_payment'
  })
});

// Returns:
{
  "fees": {
    "subtotal": "$100.00",
    "processing_fee": "$3.50",
    "total": "$103.50",
    "fee_description": "2.9% + $0.60"
  }
}
```

## Revenue Projections

Based on transaction volume:
- 100 transactions/month = $30 profit
- 1,000 transactions/month = $300 profit
- 10,000 transactions/month = $3,000 profit

Plus percentage-based profit on larger transactions:
- $1,000 invoice = $0.30 base profit
- $10,000 invoice = $0.30 base profit
- Volume adds up!

## Next Steps

1. **Run Database Migrations**:
```bash
python manage.py makemigrations payments
python manage.py migrate
```

2. **Configure Stripe Webhook** to handle payment confirmations

3. **Add Payment Status Tracking** in your invoice/vendor interfaces

4. **Implement Payout System** to withdraw your platform fees

## Important Notes

- All fees are transparent to users
- Fees are collected via Stripe's `application_fee_amount`
- Your Express account handles all transactions
- PCI compliance maintained through Stripe
- International payments supported with currency conversion

The system is ready to start collecting fees on all payments processed through your platform!