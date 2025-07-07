# Complete Stripe Price IDs Setup Guide

## Step 1: Create Products in Stripe Dashboard

Go to [https://dashboard.stripe.com/products](https://dashboard.stripe.com/products)

### Create 2 Products (if not already created):
1. **Professional Plan**
2. **Enterprise Plan**

## Step 2: Create All Price IDs

You need to create **12 total prices** - 6 regular and 6 discounted.

### 🔵 REGULAR PRICES (Full Price)

#### Professional Plan - Regular
1. **Monthly**: $15.00/month
   - Click "Add price" on Professional product
   - Amount: `15.00`
   - Currency: `USD`
   - Billing period: `Monthly`
   - Price ID: `price_professional_monthly`

2. **6-Month**: $78.00/6 months
   - Amount: `78.00`
   - Currency: `USD`
   - Billing period: `Custom` → `6 months`
   - Price ID: `price_professional_six_month`

3. **Yearly**: $144.00/year
   - Amount: `144.00`
   - Currency: `USD`
   - Billing period: `Yearly`
   - Price ID: `price_professional_yearly`

#### Enterprise Plan - Regular
4. **Monthly**: $45.00/month
   - Amount: `45.00`
   - Currency: `USD`
   - Billing period: `Monthly`
   - Price ID: `price_enterprise_monthly`

5. **6-Month**: $234.00/6 months
   - Amount: `234.00`
   - Currency: `USD`
   - Billing period: `Custom` → `6 months`
   - Price ID: `price_enterprise_six_month`

6. **Yearly**: $432.00/year
   - Amount: `432.00`
   - Currency: `USD`
   - Billing period: `Yearly`
   - Price ID: `price_enterprise_yearly`

### 🟢 DISCOUNTED PRICES (50% Off)

#### Professional Plan - Discounted
7. **Monthly**: $7.50/month
   - Amount: `7.50`
   - Currency: `USD`
   - Billing period: `Monthly`
   - Price ID: `price_professional_monthly_discounted`

8. **6-Month**: $39.00/6 months
   - Amount: `39.00`
   - Currency: `USD`
   - Billing period: `Custom` → `6 months`
   - Price ID: `price_professional_six_month_discounted`

9. **Yearly**: $72.00/year
   - Amount: `72.00`
   - Currency: `USD`
   - Billing period: `Yearly`
   - Price ID: `price_professional_yearly_discounted`

#### Enterprise Plan - Discounted
10. **Monthly**: $22.50/month
    - Amount: `22.50`
    - Currency: `USD`
    - Billing period: `Monthly`
    - Price ID: `price_enterprise_monthly_discounted`

11. **6-Month**: $117.00/6 months
    - Amount: `117.00`
    - Currency: `USD`
    - Billing period: `Custom` → `6 months`
    - Price ID: `price_enterprise_six_month_discounted`

12. **Yearly**: $216.00/year
    - Amount: `216.00`
    - Currency: `USD`
    - Billing period: `Yearly`
    - Price ID: `price_enterprise_yearly_discounted`

## Step 3: Get Your Actual Price IDs

After creating each price, Stripe will generate IDs like:
- `price_1OX2nJKL3M...` (not the nickname you entered)

To find them:
1. Go to each product
2. Click on each price
3. Copy the actual Price ID (starts with `price_`)

## Step 4: Add to Render Environment Variables

### 🔴 BACKEND ONLY (dott-api service)

Add these 12 environment variables:

```bash
# Regular Prices
STRIPE_PRICE_PRO_MONTHLY=price_1OX2nJKL3M...
STRIPE_PRICE_PRO_SIX_MONTH=price_1OX2nKKL3M...
STRIPE_PRICE_PRO_YEARLY=price_1OX2nLKL3M...
STRIPE_PRICE_ENT_MONTHLY=price_1OX2nMKL3M...
STRIPE_PRICE_ENT_SIX_MONTH=price_1OX2nNKL3M...
STRIPE_PRICE_ENT_YEARLY=price_1OX2nOKL3M...

# Discounted Prices
STRIPE_PRICE_PRO_MONTHLY_DISCOUNTED=price_1OX2nPKL3M...
STRIPE_PRICE_PRO_SIX_MONTH_DISCOUNTED=price_1OX2nQKL3M...
STRIPE_PRICE_PRO_YEARLY_DISCOUNTED=price_1OX2nRKL3M...
STRIPE_PRICE_ENT_MONTHLY_DISCOUNTED=price_1OX2nSKL3M...
STRIPE_PRICE_ENT_SIX_MONTH_DISCOUNTED=price_1OX2nTKL3M...
STRIPE_PRICE_ENT_YEARLY_DISCOUNTED=price_1OX2nUKL3M...

# Also add if not already there:
WISE_API_TOKEN=cda23806-97b9-4155-9a8b-1c27224866fa
WISE_PROFILE_ID=69037140
```

### ✅ FRONTEND - NO CHANGES NEEDED
The frontend doesn't need these variables. It gets pricing from your backend API.

## Step 5: Quick Reference Table

| Plan | Billing | Regular Price | Discounted Price (50% off) |
|------|---------|---------------|---------------------------|
| Professional | Monthly | $15.00 | $7.50 |
| Professional | 6-Month | $78.00 | $39.00 |
| Professional | Yearly | $144.00 | $72.00 |
| Enterprise | Monthly | $45.00 | $22.50 |
| Enterprise | 6-Month | $234.00 | $117.00 |
| Enterprise | Yearly | $432.00 | $216.00 |

## Step 6: Testing

After adding all environment variables:

1. **Test Regular Pricing**: 
   - Use a US IP/VPN
   - Should see full prices

2. **Test Discounted Pricing**:
   - Use Kenya VPN
   - Should see 50% off prices
   - Local currency display (KSh)

## Important Notes

⚠️ **Common Mistakes**:
- Using the nickname instead of actual price ID
- Adding to frontend instead of backend
- Missing the 6-month prices
- Wrong currency (must be USD)

✅ **Remember**:
- All prices in USD (Stripe handles conversion)
- Backend only (not frontend)
- 12 total price IDs needed
- Copy the actual IDs, not nicknames

## Troubleshooting

If prices don't show correctly:
1. Check environment variables in Render
2. Verify all 12 price IDs are set
3. Make sure backend redeployed
4. Check logs for "No price ID found" errors