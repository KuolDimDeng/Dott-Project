# Subscription Pricing & Onboarding Documentation

*Last Updated: January 2025*

## Overview

Dott offers a tiered subscription model with regional pricing to ensure global accessibility. This document outlines the subscription plans, pricing structure, regional discounts, and the onboarding flow.

## Subscription Plans

### 1. **Basic Plan (Free)**
- **Price**: Free forever
- **Features**:
  - Income and expense tracking
  - Invoice creation & reminders
  - Stripe & PayPal payments
  - Mobile money (M-Pesa, etc.)
  - Basic inventory tracking
  - Barcode scanning
  - 3GB storage limit
  - 1 user only
- **Target**: Small businesses just getting started

### 2. **Professional Plan**
- **Base Price**: $15/month
- **Billing Options**:
  - Monthly: $15/month
  - 6-Month: $75 (17% discount - $12.50/month)
  - Yearly: $144 (20% discount - $12/month)
- **Features**:
  - Everything in Basic
  - Up to 3 users
  - Unlimited storage
  - Priority support
  - All features included
- **Target**: Growing businesses

### 3. **Enterprise Plan**
- **Base Price**: $45/month
- **Billing Options**:
  - Monthly: $45/month
  - 6-Month: $225 (17% discount - $37.50/month)
  - Yearly: $432 (20% discount - $36/month)
- **Features**:
  - Everything in Professional
  - Unlimited users
  - Custom onboarding
  - Dedicated support
  - All features included
- **Target**: Large organizations

## Regional Pricing & Discounts

### Developing Country Discount: 50% Off

Businesses registered in developing countries receive an automatic 50% discount on all paid plans.

#### Discounted Prices:
- **Professional Plan**:
  - Monthly: $7.50 (was $15)
  - 6-Month: $39 (was $75)
  - Yearly: $72 (was $144)
  
- **Enterprise Plan**:
  - Monthly: $22.50 (was $45)
  - 6-Month: $117 (was $225)
  - Yearly: $216 (was $432)

#### Eligible Countries (128 total):
- **Africa (53)**: Kenya, Nigeria, Ghana, Tanzania, Uganda, Rwanda, South Africa, Egypt, Morocco, and others
- **Asia (27)**: India, Pakistan, Bangladesh, Vietnam, Philippines, Indonesia, and others
- **Pacific (12)**: Fiji, Papua New Guinea, Solomon Islands, and others
- **Caribbean & Latin America (27)**: Mexico, Brazil, Argentina, Colombia, Peru, and others
- **Eastern Europe (4)**: Ukraine, Moldova, and others
- **Middle East & North Africa (5)**: Jordan, Lebanon, Tunisia, and others

## Payment Methods by Country

### Kenya
- **Credit/Debit Card** (Visa, Mastercard, Amex) - USD
- **M-Pesa** - KES (automatic currency conversion)

### Nigeria
- **Credit/Debit Card** - USD
- **Flutterwave** (Bank Transfer) - NGN

### Ghana, Uganda, Rwanda
- **Credit/Debit Card** - USD
- **MTN Mobile Money** - Local currency

### Tanzania
- **Credit/Debit Card** - USD
- **M-Pesa** - TZS

### Other Countries
- **Credit/Debit Card** - USD (default)

## Onboarding Flow

### Step 1: Business Information
- Business name
- Business type/industry
- Legal structure
- **Country selection** (determines pricing)
- State/Province
- Date founded

### Step 2: Subscription Selection
- Plans displayed with regional pricing
- Automatic discount applied based on country
- Billing cycle selection (Monthly/6-Month/Yearly)
- Currency display in local currency where applicable

### Step 3: Payment (for paid plans)
- Payment method selection based on country
- For Kenya users:
  - M-Pesa option with KES pricing
  - Credit card option with USD pricing
- Secure payment processing
- Automatic subscription activation

### Step 4: Dashboard Access
- Immediate access after payment
- Free plan users get instant access
- Tenant workspace created automatically

## Technical Implementation

### Price Calculation
```javascript
// Base prices (USD)
const basePrices = {
  professional: { monthly: 15, sixMonth: 75, yearly: 144 },
  enterprise: { monthly: 45, sixMonth: 225, yearly: 432 }
};

// Apply regional discount
if (isDevelopingCountry) {
  price = basePrice * 0.5; // 50% discount
}

// Currency conversion for local payment methods
if (paymentMethod === 'mpesa' && country === 'KE') {
  priceInKES = priceInUSD * exchangeRate; // ~110-150 KES per USD
}
```

### API Endpoints

1. **Get Regional Pricing**
   - `GET /api/pricing/by-country?country=KE`
   - Returns pricing with discount and currency info

2. **Check Payment Methods**
   - `GET /api/payment-methods/available?country=KE`
   - Returns available payment methods for the country

3. **Create Subscription**
   - `POST /api/payments/create-subscription` (Stripe)
   - `POST /api/payments/mpesa/initiate` (M-Pesa)

## Grace Period System

- **First payment failure**: 7 days grace period
- **Repeated failures**: 3 days grace period
- Status flow: active → grace_period → suspended → active
- Automated email notifications
- No service interruption during grace period

## Key Features

1. **Automatic Detection**
   - Country selected during onboarding determines pricing
   - No manual discount codes needed
   - Instant application of regional pricing

2. **Transparent Pricing**
   - Original price shown with strikethrough
   - Discount percentage clearly displayed
   - Local currency conversion shown for mobile money

3. **Flexible Payment**
   - Multiple payment methods per country
   - USD and local currency options
   - Secure processing via Stripe and regional providers

4. **Fair Access**
   - 50% discount for all developing countries
   - Same features across all regions
   - Local payment method support

## Currency Examples

### Kenya (M-Pesa)
- Professional: KSh 825/month (was KSh 1,650)
- Enterprise: KSh 2,475/month (was KSh 4,950)
- *Exchange rate: 1 USD = 110 KES (varies)*

### Nigeria (Flutterwave)
- Professional: ₦3,450/month (was ₦6,900)
- Enterprise: ₦10,350/month (was ₦20,700)
- *Exchange rate: 1 USD = 460 NGN (varies)*

## Best Practices

1. **Always verify country during onboarding** - This determines pricing for the lifetime of the account
2. **Show both USD and local currency** - Helps users understand the value
3. **Clear discount communication** - Display savings prominently
4. **Payment method flexibility** - Offer local options where available

## Support

For subscription-related issues:
- Email: support@dottapps.com
- Help Center: dottapps.com/help
- Live Chat: Available for Professional and Enterprise plans

## Future Enhancements

1. **Additional Payment Methods**
   - PayPal for more countries
   - Airtel Money for East Africa
   - bKash for Bangladesh
   - Paytm for India

2. **Dynamic Exchange Rates**
   - Real-time currency conversion
   - Rate locking at purchase time

3. **Team Billing**
   - Consolidated invoices
   - Volume discounts
   - Department-level billing