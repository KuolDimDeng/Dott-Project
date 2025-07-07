# Smart Payment Strategy for Dott

## Overview
A dual payment processor strategy that maximizes revenue while minimizing currency conversion losses.

## Payment Flow by Country

### 🇰🇪 Kenya (and other African countries with mobile money)

#### Option 1: Mobile Money via Paystack (RECOMMENDED)
- **Currency**: Local (KES)
- **Flow**: Customer pays KES → You receive KES → Keep in local currency
- **Benefits**: 
  - No conversion fees
  - Instant payments
  - Higher conversion rates (locals prefer M-Pesa)
- **Example**: KSh 975/month stays as KSh 975

#### Option 2: Credit/Debit Card via Stripe
- **Currency**: USD
- **Flow**: Show USD price → Stripe charges USD → Customer's bank converts
- **Benefits**: 
  - Simple accounting (all in USD)
  - No double conversion
  - Works for international cards
- **Example**: $7.50/month (customer's bank converts to ~KSh 975)

### 🌍 Other Countries (without mobile money)
- **Only Option**: Stripe in USD
- **Same benefits**: Simple, no double conversion

## Pricing Display Strategy

### Local Currency Display (with Wise API)
- Show prices in local currency for better UX
- Add 3% markup to cover any losses
- Example: $15 → KSh 1,938 → KSh 1,996 (with 3%)

### Why 3% Markup?
- Covers Stripe's conversion spread (2-4%)
- Ensures you never lose money on conversions
- Still very competitive vs local competitors

## Revenue Examples

### Scenario 1: Kenyan customer pays with M-Pesa
- Price shown: KSh 975 (discounted)
- You receive: KSh 975
- No conversion = No loss ✅

### Scenario 2: Kenyan customer pays with Stripe
- Price shown: $7.50 (discounted)
- Customer pays: $7.50
- You receive: $7.50
- Their bank handles KES conversion ✅

### Scenario 3: US customer pays with Stripe
- Price shown: $15.00
- Customer pays: $15.00
- You receive: $15.00
- No conversion needed ✅

## Implementation Details

### Backend Logic
```python
# For Paystack - use local currency
if payment_method == 'mobile_money':
    charge_amount = local_currency_price  # KSh 975
    charge_currency = 'KES'

# For Stripe - always use USD
elif payment_method == 'card':
    charge_amount = usd_price  # $7.50
    charge_currency = 'USD'
```

### Frontend Display
- Mobile Money: "Pay KSh 975 - no conversion fees"
- Credit Card: "Pay $7.50 - your bank will convert"

## Benefits of This Approach

1. **No Revenue Loss**: You always receive exactly what you charge
2. **Better UX**: Customers see familiar currency/payment methods
3. **Higher Conversion**: Locals prefer local payment methods
4. **Simple Accounting**: Stripe = USD, Paystack = Local
5. **Transparent**: Customers know exactly what they'll pay

## Setup Required

### Stripe
- Keep all products in USD
- No multi-currency setup needed
- Simple and clean

### Paystack
- Set up local currency accounts
- Enable mobile money providers
- Handle local payouts

### Wise API
- Only for display purposes
- Shows local currency with 3% markup
- Helps customers understand pricing

## FAQ

**Q: Why not use Stripe's multi-currency?**
A: Their conversion rates are poor (2-4% spread), and you'd lose money on every transaction.

**Q: What if someone complains about USD charges?**
A: Explain that their bank provides better rates than payment processors, saving them money.

**Q: Should I increase the markup more?**
A: 3% is optimal - covers costs while staying competitive. Higher might hurt conversions.

**Q: What about other payment methods?**
A: This strategy works for any dual-processor setup. Same principles apply.

## Summary

✅ **Paystack** = Local currency, no conversion
✅ **Stripe** = USD only, bank converts
✅ **3% markup** = Covers any potential losses
✅ **Result** = Maximum revenue, happy customers