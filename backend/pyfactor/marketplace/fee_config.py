"""
Marketplace Fee Configuration
Centralized configuration for all platform fees and commissions
"""
from decimal import Decimal

# Platform Commission (charged to restaurants/businesses)
PLATFORM_COMMISSION_RATE = Decimal('0.10')  # 10% of food/items subtotal

# Delivery Fee Split
COURIER_EARNINGS_RATE = Decimal('0.70')     # 70% to courier
PLATFORM_DELIVERY_RATE = Decimal('0.30')    # 30% to platform

# Stripe Fees (what Stripe charges us)
STRIPE_PERCENTAGE_FEE = Decimal('0.029')    # 2.9%
STRIPE_FIXED_FEE = Decimal('0.30')          # $0.30

# Platform's Stripe Revenue (what we charge on top for card payments)
PLATFORM_STRIPE_PERCENTAGE = Decimal('0.001')  # 0.1%
PLATFORM_STRIPE_FIXED = Decimal('0.30')        # $0.30

# Regional Settings
DEFAULT_CURRENCY = 'USD'
DEFAULT_TAX_RATE = Decimal('0.18')  # 18% for South Sudan

# Fee Descriptions for UI
FEE_DESCRIPTIONS = {
    'platform_commission': f'{int(PLATFORM_COMMISSION_RATE * 100)}% platform fee',
    'delivery_split': f'{int(COURIER_EARNINGS_RATE * 100)}% to courier, {int(PLATFORM_DELIVERY_RATE * 100)}% to platform',
    'stripe_fee': f'{STRIPE_PERCENTAGE_FEE * 100}% + ${STRIPE_FIXED_FEE}',
    'platform_stripe': f'{PLATFORM_STRIPE_PERCENTAGE * 100}% + ${PLATFORM_STRIPE_FIXED}'
}

# Minimum amounts
MINIMUM_ORDER_AMOUNT = Decimal('5.00')
MINIMUM_DELIVERY_FEE = Decimal('2.00')
MAXIMUM_DELIVERY_FEE = Decimal('10.00')

# Settlement timing (in days)
RESTAURANT_SETTLEMENT_DAYS = 7  # Weekly payouts to restaurants
COURIER_SETTLEMENT_DAYS = 3     # Twice weekly to couriers

def calculate_total_platform_revenue(subtotal, delivery_fee=Decimal('0'), total_amount=None):
    """
    Calculate total platform revenue from an order

    Args:
        subtotal: Food/items subtotal
        delivery_fee: Delivery fee charged to customer
        total_amount: Total order amount (for Stripe platform fee calculation)

    Returns:
        dict with breakdown of all platform revenue
    """
    subtotal = Decimal(str(subtotal))
    delivery_fee = Decimal(str(delivery_fee))

    # If total not provided, calculate it
    if total_amount is None:
        tax = subtotal * DEFAULT_TAX_RATE
        total_amount = subtotal + tax + delivery_fee
    else:
        total_amount = Decimal(str(total_amount))

    # Platform revenues
    restaurant_commission = subtotal * PLATFORM_COMMISSION_RATE
    delivery_commission = delivery_fee * PLATFORM_DELIVERY_RATE
    stripe_platform_fee = (total_amount * PLATFORM_STRIPE_PERCENTAGE) + PLATFORM_STRIPE_FIXED

    # What others get
    courier_earnings = delivery_fee * COURIER_EARNINGS_RATE
    restaurant_payout = subtotal - restaurant_commission
    stripe_processing = (total_amount * STRIPE_PERCENTAGE_FEE) + STRIPE_FIXED_FEE

    return {
        # Platform revenues
        'restaurant_commission': restaurant_commission,
        'delivery_commission': delivery_commission,
        'stripe_platform_fee': stripe_platform_fee,
        'total_platform_revenue': restaurant_commission + delivery_commission + stripe_platform_fee,

        # Payouts
        'restaurant_payout': restaurant_payout,
        'courier_earnings': courier_earnings,

        # Costs
        'stripe_processing_cost': stripe_processing,

        # Net profit
        'platform_net_profit': restaurant_commission + delivery_commission + stripe_platform_fee - stripe_processing
    }