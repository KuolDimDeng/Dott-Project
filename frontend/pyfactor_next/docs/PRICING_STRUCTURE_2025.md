# Pricing Structure - Updated January 2025

## Overview
This document outlines the updated subscription pricing structure implemented in January 2025.

## Subscription Tiers

### 1. Basic (Free)
**Target**: Small businesses just getting started
**Price**: FREE
**User Limit**: 1 user only
**Storage**: 3GB limit
**Support**: Basic support (non-priority)

**Features**:
- ✓ Income and expense tracking
- ✓ Invoice creation
- ✓ Automated invoice reminders
- ✓ Accept Stripe & PayPal payments
- ✓ Mobile money payments (M-Pesa, etc.)
- ✓ Reduced transaction fees
- ✓ Multi-currency support
- ✓ Basic inventory tracking
- ✓ Low stock alerts
- ✓ Barcode scanning
- ✓ Inventory forecasting

### 2. Professional
**Target**: Growing businesses that need to scale
**Price**: $15/month or $144/year (20% discount on annual)
**User Limit**: Up to 3 users
**Storage**: Unlimited
**Support**: Priority support

**Features**:
- ✓ All Basic features
- ✓ 3 user collaboration
- ✓ Unlimited storage
- ✓ Priority support
- ✓ All features included

### 3. Enterprise
**Target**: Large organizations needing unlimited scale
**Price**: $35/month or $336/year (20% discount on annual)
**User Limit**: Unlimited users
**Storage**: Unlimited everything
**Support**: Priority support + Custom onboarding

**Features**:
- ✓ All Professional features
- ✓ Unlimited users
- ✓ Custom onboarding
- ✓ Dedicated support
- ✓ All features included

## Key Points

### Core Features Available in ALL Tiers
All plans include the same core functionality:
- Income and expense tracking
- Invoice creation and automated reminders
- Payment processing (Stripe, PayPal, Mobile Money)
- Multi-currency support
- Inventory management with alerts and forecasting
- 24/7 customer support
- Regular updates
- Secure data encryption

### Differentiation
Plans differ primarily in:
1. **User Limits**: 1 user (Basic) → 3 users (Professional) → Unlimited (Enterprise)
2. **Storage**: 3GB (Basic) → Unlimited (Professional & Enterprise)
3. **Support Level**: Basic → Priority → Priority + Custom Onboarding
4. **Annual Discount**: 20% off when paying annually for paid tiers

### Regional Pricing
- Developing countries receive 50% discount on all paid plans
- Professional: $7.50/mo or $72/year in developing countries
- Enterprise: $17.50/mo or $168/year in developing countries
- Automatic detection based on user location

## Implementation Details

### Files Updated
1. `/frontend/pyfactor_next/src/app/components/Pricing.js`
   - Home page pricing section
   - Dynamic pricing based on user location
   - Annual/monthly toggle

2. `/frontend/pyfactor_next/src/components/Onboarding/SubscriptionForm.jsx`
   - Onboarding subscription selection
   - Matches home page pricing
   - Handles free plan instant activation

### Database Considerations
- `subscription_plan` field stores: 'free', 'professional', or 'enterprise'
- `billing_cycle` field stores: 'monthly' or 'annual'
- Free plan users skip payment step in onboarding

### Payment Flow
- Basic (Free): Instant activation, no payment required
- Professional/Enterprise: Requires payment via Stripe before activation
- Payment verification prevents bypassing payment step

## Migration Notes
- Previous pricing: Professional was $29/mo, Enterprise was $99/mo
- All existing users maintain their current pricing (grandfathered)
- New signups use the new pricing structure

---
Last Updated: January 16, 2025