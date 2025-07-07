# Mobile Money Payment Integration

## Overview
This implementation adds mobile money payment support via Paystack, starting with M-Pesa in Kenya and structured to easily add more countries.

## Features
- Automatic detection of mobile money support based on user's country
- Payment method selection during subscription checkout
- M-Pesa integration for Kenya (expandable to other countries)
- Real-time payment verification
- Seamless fallback to credit card for unsupported countries

## How It Works

### 1. Country Detection
During business onboarding, when a user selects Kenya as their country, the system:
- Marks them as eligible for mobile money payments
- Stores this in the `mobile_money_countries` table

### 2. Payment Method Selection
On the subscription page, users from supported countries see:
- Credit/Debit Card (Stripe)
- Mobile Money (M-Pesa via Paystack)

### 3. Mobile Money Checkout Flow
1. User selects mobile money and enters phone number
2. System initiates payment via Paystack API
3. User receives STK push on their phone
4. User enters PIN to authorize payment
5. System polls for payment confirmation
6. Upon success, subscription is activated

## Technical Implementation

### Database Tables
- `mobile_money_countries`: Countries supporting mobile money
- `mobile_money_providers`: Providers like M-Pesa, MTN Money, etc.

### Backend APIs
- `GET /api/payment-methods/` - Get available payment methods
- `POST /api/checkout/mobile-money/` - Create mobile money checkout
- `POST /api/checkout/mobile-money/verify/` - Verify payment status

### Frontend Components
- `PaymentMethodSelector` - UI for choosing payment method
- `MobileMoneyCheckout` - Phone number input and payment flow

## Configuration

### Environment Variables
```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_WEBHOOK_SECRET=xxxxx
```

### Supported Countries (Currently)
- **Kenya (KE)**: M-Pesa - Active
- Ready to add: Nigeria, Ghana, South Africa, etc.

## Adding New Countries

1. Update the migration to add country:
```python
MobileMoneyCountry.objects.create(
    country_code='NG',
    country_name='Nigeria',
    currency_code='NGN',
    providers=['MTN Mobile Money', 'Airtel Money'],
    display_name='Mobile Money',
    is_active=True
)
```

2. Add currency conversion in `paystack_integration.py`
3. Update phone number validation for the country

## Testing

### Test with M-Pesa (Kenya)
1. Create business with country = Kenya
2. Go to subscription page
3. Select "Mobile Money (M-Pesa)"
4. Enter phone: 0712345678
5. Complete payment on phone

### Test Card Fallback
1. Create business with country = USA
2. Go to subscription page
3. Only "Credit/Debit Card" option appears

## Security Considerations
- Phone numbers are validated before submission
- All payments verified server-side
- Webhook signatures validated
- No sensitive data stored

## Future Enhancements
1. Add more countries:
   - Nigeria (NGN) - MTN Money, Airtel Money
   - Ghana (GHS) - MTN Money, Vodafone Cash
   - South Africa (ZAR) - SnapScan, Zapper
   - Uganda (UGX) - MTN Money, Airtel Money
   - Tanzania (TZS) - M-Pesa, Tigo Pesa
   - Rwanda (RWF) - MTN Money, Airtel Money

2. Features to add:
   - USSD payment option
   - Payment history
   - Automatic retry on failure
   - SMS notifications
   - Multi-currency display

## Troubleshooting

### Payment not going through
1. Check Paystack dashboard for transaction
2. Verify phone number format (+254...)
3. Ensure sufficient balance
4. Check Paystack API status

### Country not showing mobile money
1. Verify country in `mobile_money_countries` table
2. Check `is_active` and `paystack_enabled` flags
3. Clear cache and refresh

## Support
For issues with mobile money payments:
- Check Paystack documentation
- Review server logs for API errors
- Contact support@dottapps.com