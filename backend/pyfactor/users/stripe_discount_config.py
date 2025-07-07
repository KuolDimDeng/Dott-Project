"""
Stripe configuration for regional discount pricing
These price IDs need to be created in your Stripe dashboard
"""
import os
from django.conf import settings


# Regular prices (no discount)
STRIPE_PRICES_REGULAR = {
    'professional': {
        'monthly': os.getenv('STRIPE_PRICE_PRO_MONTHLY', 'price_professional_monthly'),
        'six_month': os.getenv('STRIPE_PRICE_PRO_SIX_MONTH', 'price_professional_six_month'),
        'yearly': os.getenv('STRIPE_PRICE_PRO_YEARLY', 'price_professional_yearly'),
    },
    'enterprise': {
        'monthly': os.getenv('STRIPE_PRICE_ENT_MONTHLY', 'price_enterprise_monthly'),
        'six_month': os.getenv('STRIPE_PRICE_ENT_SIX_MONTH', 'price_enterprise_six_month'),
        'yearly': os.getenv('STRIPE_PRICE_ENT_YEARLY', 'price_enterprise_yearly'),
    }
}

# Discounted prices (50% off for developing countries)
STRIPE_PRICES_DISCOUNTED = {
    'professional': {
        'monthly': os.getenv('STRIPE_PRICE_PRO_MONTHLY_DISCOUNTED', 'price_professional_monthly_discounted'),
        'six_month': os.getenv('STRIPE_PRICE_PRO_SIX_MONTH_DISCOUNTED', 'price_professional_six_month_discounted'),
        'yearly': os.getenv('STRIPE_PRICE_PRO_YEARLY_DISCOUNTED', 'price_professional_yearly_discounted'),
    },
    'enterprise': {
        'monthly': os.getenv('STRIPE_PRICE_ENT_MONTHLY_DISCOUNTED', 'price_enterprise_monthly_discounted'),
        'six_month': os.getenv('STRIPE_PRICE_ENT_SIX_MONTH_DISCOUNTED', 'price_enterprise_six_month_discounted'),
        'yearly': os.getenv('STRIPE_PRICE_ENT_YEARLY_DISCOUNTED', 'price_enterprise_yearly_discounted'),
    }
}


def get_stripe_price_id(plan_type, billing_cycle='monthly', is_discounted=False):
    """
    Get the appropriate Stripe price ID based on plan and discount status
    
    Args:
        plan_type: 'professional' or 'enterprise'
        billing_cycle: 'monthly', 'six_month', or 'yearly'
        is_discounted: Boolean indicating if discounted price should be used
    
    Returns:
        Stripe price ID string
    """
    price_map = STRIPE_PRICES_DISCOUNTED if is_discounted else STRIPE_PRICES_REGULAR
    
    try:
        return price_map[plan_type][billing_cycle]
    except KeyError:
        # Fallback to regular monthly professional if invalid params
        return STRIPE_PRICES_REGULAR['professional']['monthly']


# Instructions for creating prices in Stripe Dashboard:
"""
To create the discounted prices in Stripe:

1. Go to https://dashboard.stripe.com/products
2. Create or find your existing products (Professional, Enterprise)
3. For each product, add new prices:

Professional Monthly Discounted:
- Amount: $7.50
- Recurring: Monthly
- Price ID: price_professional_monthly_discounted

Professional 6-Month Discounted:
- Amount: $39.00
- Recurring: Every 6 months
- Price ID: price_professional_six_month_discounted

Professional Yearly Discounted:
- Amount: $72.00
- Recurring: Yearly
- Price ID: price_professional_yearly_discounted

Enterprise Monthly Discounted:
- Amount: $22.50
- Recurring: Monthly
- Price ID: price_enterprise_monthly_discounted

Enterprise 6-Month Discounted:
- Amount: $117.00
- Recurring: Every 6 months
- Price ID: price_enterprise_six_month_discounted

Enterprise Yearly Discounted:
- Amount: $216.00
- Recurring: Yearly
- Price ID: price_enterprise_yearly_discounted

4. Update your environment variables:
STRIPE_PRICE_PRO_MONTHLY_DISCOUNTED=price_xxx
STRIPE_PRICE_PRO_SIX_MONTH_DISCOUNTED=price_xxx
STRIPE_PRICE_PRO_YEARLY_DISCOUNTED=price_xxx
STRIPE_PRICE_ENT_MONTHLY_DISCOUNTED=price_xxx
STRIPE_PRICE_ENT_SIX_MONTH_DISCOUNTED=price_xxx
STRIPE_PRICE_ENT_YEARLY_DISCOUNTED=price_xxx
"""