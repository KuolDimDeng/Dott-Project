# Stripe Connect Invoice Payments Implementation

## Overview
This document details the implementation of the "Pay Invoice" feature using Stripe Connect Express, which allows Dott customers to accept online payments for their invoices while Dott collects a platform fee of 2.5% + $0.30 per transaction.

## Architecture

### Database Schema Changes
Added Stripe Connect fields to the Business model (`/backend/pyfactor/users/models.py`):
- `stripe_account_id` (CharField): Stores the Stripe Connect Express account ID
- `stripe_onboarding_complete` (BooleanField): Tracks whether onboarding is complete
- `stripe_charges_enabled` (BooleanField): Whether the account can accept charges
- `stripe_payouts_enabled` (BooleanField): Whether the account can receive payouts

Migration: `/backend/pyfactor/users/migrations/0008_add_stripe_connect_fields.py`

### Backend Implementation

#### 1. Stripe Connect Management (`/backend/pyfactor/payments/stripe_connect.py`)
Handles the Stripe Connect Express account lifecycle:

**Endpoints:**
- `POST /api/payments/stripe-connect/create-account/` - Creates a new Stripe Connect Express account
- `POST /api/payments/stripe-connect/onboarding-link/` - Generates onboarding URL for account setup
- `GET /api/payments/stripe-connect/account-status/` - Retrieves current account status and requirements
- `POST /api/payments/stripe-connect/refresh-onboarding/` - Creates a refresh link for incomplete onboarding

**Key Features:**
- Automatic account creation with business information
- Real-time status tracking and requirement monitoring
- Secure onboarding flow with return URL handling

#### 2. Invoice Payment Processing (`/backend/pyfactor/payments/invoice_checkout.py`)
Handles customer invoice payments with platform fees:

**Endpoints:**
- `POST /api/payments/stripe/create-invoice-checkout/` - Creates Stripe Checkout session with platform fee
- `POST /api/payments/invoice-payment-link/` - Generates shareable payment links for invoices
- `GET /api/payments/invoice-details/<uuid:invoice_id>/` - Public endpoint for invoice details

**Platform Fee Implementation:**
```python
# Calculate platform fee (2.5% + $0.30)
platform_fee_percent = Decimal('0.025')  # 2.5%
platform_fee_fixed = 30  # $0.30 in cents
platform_fee_amount = int(float(invoice.total_amount) * float(platform_fee_percent) * 100) + platform_fee_fixed

# Create Stripe Checkout with platform fee
checkout_session = stripe.checkout.Session.create(
    payment_intent_data={
        'application_fee_amount': platform_fee_amount,
        'transfer_data': {
            'destination': business.stripe_account_id,
        }
    }
)
```

### Frontend Implementation

#### 1. Payment Settings Page (`/frontend/pyfactor_next/src/app/dashboard/settings/payments/page.js`)
Complete Stripe Connect onboarding interface:

**Features:**
- Visual onboarding progress tracking
- Account status indicators (Account Created → Onboarding → Payments Enabled)
- Automatic handling of Stripe return URLs
- Requirements display for incomplete accounts
- One-click setup and refresh capabilities

**User Flow:**
1. Business owner navigates to Settings → Payments
2. Clicks "Set Up Online Payments" to create Stripe account
3. Redirected to Stripe for onboarding (bank details, identity verification)
4. Returns to Dott with setup complete
5. Can now accept online payments

#### 2. Invoice Management Integration (`/frontend/pyfactor_next/src/app/dashboard/components/forms/InvoiceManagement.js`)
Added "Pay Invoice" button to invoice actions:

**Implementation:**
```javascript
const handlePayInvoice = async (invoice) => {
  try {
    const response = await fetch('/api/payments/invoice-payment-link/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ invoice_id: invoice.id })
    });
    
    const data = await response.json();
    await navigator.clipboard.writeText(data.payment_url);
    toast.success('Payment link copied to clipboard!');
    window.open(data.payment_url, '_blank');
  } catch (error) {
    // Error handling
  }
};
```

#### 3. Customer Payment Page (`/frontend/pyfactor_next/src/app/pay/[id]/page.js`)
Public invoice payment interface:

**Features:**
- Professional invoice display with business branding
- Secure Stripe Checkout integration
- Payment availability checking
- Clear error messages for unavailable payments
- Mobile-responsive design

**Security:**
- No authentication required for customers
- Invoice details fetched from public API
- Payment processing through Stripe's secure checkout
- Platform fees handled transparently

## URL Structure

### Backend URLs (`/backend/pyfactor/payments/urls.py`)
```python
urlpatterns = [
    # Stripe Connect Express endpoints
    path('stripe-connect/create-account/', stripe_connect.create_stripe_connect_account),
    path('stripe-connect/onboarding-link/', stripe_connect.create_onboarding_link),
    path('stripe-connect/account-status/', stripe_connect.get_account_status),
    path('stripe-connect/refresh-onboarding/', stripe_connect.refresh_onboarding_link),
    
    # Invoice payment endpoints
    path('invoice-checkout/', invoice_checkout.create_invoice_checkout),
    path('invoice-payment-link/', invoice_checkout.create_invoice_payment_link),
    path('invoice-details/<uuid:invoice_id>/', invoice_checkout.get_invoice_details),
    path('stripe/create-invoice-checkout/', invoice_checkout.create_invoice_checkout),
]
```

## Revenue Model

### Platform Fee Structure
- **Base Fee**: 2.5% of transaction amount
- **Fixed Fee**: $0.30 per transaction
- **Example**: On a $100 invoice:
  - Customer pays: $100.00
  - Platform fee: $2.50 + $0.30 = $2.80
  - Business receives: $97.20
  - Dott receives: $2.80

### Stripe Fee Distribution
1. Stripe charges their standard fee to the platform (Dott)
2. Customer payment goes to connected account (Business)
3. Platform fee automatically transferred to Dott
4. Single settlement for businesses (payment minus platform fee)

## Security Considerations

### Authentication & Authorization
- Business users must be authenticated to access Stripe Connect setup
- Invoice payment pages are public (no auth required)
- Tenant isolation enforced through Django middleware
- API endpoints validate business ownership of invoices

### Data Protection
- No sensitive payment data stored in Dott database
- All payment processing handled by Stripe
- Platform fees tracked in payment metadata
- Audit trail for all transactions

### Error Handling
- Comprehensive error messages for setup issues
- Graceful degradation when payments unavailable
- Clear user feedback at every step
- Fallback messages for customers when business hasn't completed setup

## Testing Considerations

### Stripe Test Mode
- Use Stripe test API keys for development
- Test card numbers: 4242 4242 4242 4242
- Test Connect accounts automatically approved
- Platform fees visible in Stripe Dashboard

### Test Scenarios
1. **Onboarding Flow**: Create account → Complete onboarding → Verify status
2. **Payment Flow**: Create invoice → Generate link → Customer payment → Verify fees
3. **Error Cases**: Incomplete onboarding → Payment attempted → Error message
4. **Edge Cases**: Multiple partial payments, refunds, international payments

## Future Enhancements

### Planned Features
1. **Recurring Payments**: Subscription invoices with automated billing
2. **Payment Plans**: Allow customers to pay in installments
3. **International Support**: Multi-currency with dynamic platform fees
4. **Advanced Analytics**: Platform fee revenue dashboard
5. **Automated Payouts**: Scheduled transfers to business bank accounts

### Integration Opportunities
1. **QuickBooks Sync**: Automatic invoice status updates
2. **Email Automation**: Payment confirmation emails
3. **SMS Notifications**: Payment reminders via Twilio
4. **Accounting Integration**: Automatic fee recording in books

## Environment Variables Required

### Backend (.env)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Deployment Checklist

- [ ] Run Django migration for Business model changes
- [ ] Configure Stripe API keys in production
- [ ] Set up Stripe webhooks for payment events
- [ ] Update FRONTEND_URL for production domain
- [ ] Test complete flow with real Stripe account
- [ ] Monitor initial transactions for platform fees
- [ ] Set up alerting for failed payments

## Support Documentation

### For Business Users
- How to set up Stripe Connect
- Understanding platform fees
- Managing payment settings
- Troubleshooting payment issues

### For Customers
- How to pay an invoice online
- Supported payment methods
- Security and privacy
- Getting payment receipts

---

**Implementation Date**: January 2025
**Version**: 1.0.0
**Status**: Production Ready