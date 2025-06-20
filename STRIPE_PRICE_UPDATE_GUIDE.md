# Stripe Enterprise Price Update Guide

## Current Prices (OLD - $35/month)
- Monthly: `price_1RZMDhFls6i75mQB9kMjeKtx`
- Yearly: `price_1RZMDiFls6i75mQBqQwHnERW`

## Steps to Update to New Prices ($45/month)

### Option 1: Using the Script (Recommended)
```bash
# From the frontend directory
cd frontend/pyfactor_next

# Set your Stripe secret key
export STRIPE_SECRET_KEY="your_stripe_secret_key_here"

# Run the script to create new prices
node scripts/create-new-enterprise-prices.js

# To also archive old prices
node scripts/create-new-enterprise-prices.js --archive
```

### Option 2: Manual Update in Stripe Dashboard

1. **Login to Stripe Dashboard**
   - Go to https://dashboard.stripe.com

2. **Create New Prices**
   - Navigate to Products → Find "Enterprise Plan"
   - Click "Add another price"
   
   **Monthly Price:**
   - Pricing model: Standard pricing
   - Price: $45.00
   - Billing period: Monthly
   - Add metadata:
     - `plan_type`: `enterprise`
     - `billing_cycle`: `monthly`
   
   **Yearly Price:**
   - Pricing model: Standard pricing
   - Price: $432.00
   - Billing period: Yearly
   - Add metadata:
     - `plan_type`: `enterprise`
     - `billing_cycle`: `yearly`

3. **Copy the New Price IDs**
   - After creating, copy the price IDs (they start with `price_`)

4. **Update Render Environment Variables**
   - Go to your Render dashboard
   - Navigate to Environment → Environment Variables
   - Update:
     - `STRIPE_PRICE_ENTERPRISE_MONTHLY` = [new monthly price ID]
     - `STRIPE_PRICE_ENTERPRISE_YEARLY` = [new yearly price ID]
   - Click "Save Changes"

5. **Deploy the Changes**
   - Click "Manual Deploy" → "Deploy latest commit"

6. **Archive Old Prices** (Optional but recommended)
   - In Stripe Dashboard, find the old prices
   - Click on each price → "Deactivate price"
   - This prevents new subscriptions but doesn't affect existing ones

## Testing

After deployment, test the new prices:
1. Go to your pricing page
2. Click on Enterprise plan
3. Verify it shows $45/month or $432/year
4. Try creating a test subscription

## Important Notes

- Existing subscriptions will continue at their current price ($35)
- Only new subscriptions will use the new price ($45)
- To update existing customers, you'll need to handle that separately in Stripe

## Rollback (if needed)

If you need to rollback:
1. Update the environment variables back to old price IDs
2. Redeploy
3. Reactivate old prices in Stripe if you archived them