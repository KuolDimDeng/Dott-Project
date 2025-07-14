"""
Stripe Fee Configuration for Dott Platform
"""
from decimal import Decimal

# Platform fee structure
PLATFORM_FEES = {
    'invoice_payment': {
        'percentage': Decimal('0.029'),  # 2.9%
        'fixed': 60,  # $0.60 in cents
        'description': '2.9% + $0.60'
    },
    'vendor_payment': {
        'percentage': Decimal('0.029'),  # 2.9%
        'fixed': 60,  # $0.60 in cents
        'description': '2.9% + $0.60'
    },
    'payroll': {
        'percentage': Decimal('0.024'),  # 2.4%
        'fixed': 0,
        'description': '2.4%'
    },
    'subscription': {
        'percentage': Decimal('0.025'),  # 2.5%
        'fixed': 0,
        'description': '2.5%'
    }
}

# Stripe's actual costs (what they charge us)
STRIPE_COSTS = {
    'percentage': Decimal('0.029'),  # 2.9%
    'fixed': 30  # $0.30 in cents
}

def calculate_platform_fee(amount_cents, fee_type='invoice_payment'):
    """
    Calculate the platform fee for a transaction
    
    Args:
        amount_cents: Transaction amount in cents
        fee_type: Type of transaction (invoice_payment, vendor_payment, etc.)
    
    Returns:
        dict: {
            'platform_fee': Total fee we charge (in cents),
            'stripe_cost': What Stripe charges us (in cents),
            'platform_profit': Our profit (in cents),
            'fee_description': Human-readable fee description
        }
    """
    fee_config = PLATFORM_FEES.get(fee_type, PLATFORM_FEES['invoice_payment'])
    
    # Calculate our platform fee
    percentage_fee = int(amount_cents * fee_config['percentage'])
    platform_fee = percentage_fee + fee_config['fixed']
    
    # Calculate Stripe's cost to us
    stripe_percentage = int(amount_cents * STRIPE_COSTS['percentage'])
    stripe_cost = stripe_percentage + STRIPE_COSTS['fixed']
    
    # Our profit
    platform_profit = platform_fee - stripe_cost
    
    return {
        'platform_fee': platform_fee,
        'stripe_cost': stripe_cost,
        'platform_profit': platform_profit,
        'fee_description': fee_config['description'],
        'breakdown': {
            'percentage_amount': percentage_fee,
            'fixed_amount': fee_config['fixed']
        }
    }

def format_fee_for_display(amount_cents, fee_type='invoice_payment'):
    """
    Format fee information for display to users
    
    Returns formatted strings for UI display
    """
    fee_info = calculate_platform_fee(amount_cents, fee_type)
    
    return {
        'subtotal': f"${amount_cents / 100:.2f}",
        'processing_fee': f"${fee_info['platform_fee'] / 100:.2f}",
        'total': f"${(amount_cents + fee_info['platform_fee']) / 100:.2f}",
        'fee_description': fee_info['fee_description'],
        'breakdown': f"({fee_info['fee_description']} processing fee)"
    }