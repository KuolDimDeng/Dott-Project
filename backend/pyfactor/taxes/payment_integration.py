# taxes/payment_integration.py
import stripe
import logging
from decimal import Decimal
from datetime import timedelta
from django.conf import settings
from django.urls import reverse
from django.utils import timezone
from taxes.models import TaxFiling

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


def create_tax_filing_checkout_session(filing, success_url, cancel_url):
    """
    Create a Stripe checkout session for tax filing payment
    
    Args:
        filing: TaxFiling instance
        success_url: URL to redirect to after successful payment
        cancel_url: URL to redirect to if payment is cancelled
        
    Returns:
        dict: Contains checkout_url and session_id
    """
    try:
        # Calculate final price with complexity multiplier
        final_price = filing.price * filing.complexity_multiplier
        
        # Create line items based on tax type and service
        line_items = []
        
        # Main service line item
        service_description = f"{filing.get_service_type_display()} Tax Filing Service"
        period_description = f"Filing Period: {filing.filing_period}"
        
        line_items.append({
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': f"{filing.get_tax_type_display()} - {service_description}",
                    'description': period_description,
                },
                'unit_amount': int(final_price * 100),  # Stripe uses cents
            },
            'quantity': 1,
        })
        
        # Add complexity adjustment if applicable
        if filing.complexity_multiplier > 1:
            adjustment_amount = filing.price * (filing.complexity_multiplier - 1)
            line_items.append({
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Complexity Adjustment',
                        'description': f'Additional charge for complex filing ({filing.complexity_multiplier}x)',
                    },
                    'unit_amount': int(adjustment_amount * 100),
                },
                'quantity': 1,
            })
        
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'filing_id': str(filing.filing_id),
                'tax_type': filing.tax_type,
                'service_type': filing.service_type,
                'filing_period': filing.filing_period,
                'tenant_id': str(filing.tenant_id) if filing.tenant_id else '',
            },
            customer_email=filing.user_email,
            # Expires in 24 hours
            expires_at=int((timezone.now() + timedelta(hours=24)).timestamp()),
        )
        
        # Log session creation
        logger.info(f"Created Stripe checkout session {session.id} for filing {filing.filing_id}")
        
        return {
            'checkout_url': session.url,
            'session_id': session.id,
            'success': True
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': 'Payment processing error. Please try again.',
            'error_code': 'stripe_error'
        }
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': 'An unexpected error occurred. Please try again.',
            'error_code': 'system_error'
        }


def get_pricing_for_tax_filing(tax_type, service_type, filing_data=None):
    """
    Calculate pricing for a tax filing based on type and complexity
    
    Args:
        tax_type: Type of tax (sales, payroll, income)
        service_type: Service level (fullService, selfService)
        filing_data: Additional data that might affect pricing (e.g., number of locations)
        
    Returns:
        dict: Contains base_price, complexity_multiplier, final_price
    """
    # Updated pricing matrix - matches frontend
    base_prices = {
        'sales': {
            'fullService': {'base': 75, 'quarterly': 75, 'annual': 300, 'multiState': 200},
            'selfService': {'base': 35, 'quarterly': 35, 'annual': 140, 'multiState': 100}
        },
        'payroll': {
            'fullService': {'base': 125, 'quarterly941': 125, 'annual940': 150, 'completePackage': 450},
            'selfService': {'base': 65, 'quarterly941': 65, 'annual940': 85, 'completePackage': 250}
        },
        'income': {
            'fullService': {'base': 250, 'soleProprietor': 250, 'llcSCorp': 395, 'cCorp': 595, 'perState': 75},
            'selfService': {'base': 125, 'soleProprietor': 125, 'llcSCorp': 195, 'cCorp': 295, 'perState': 50}
        },
        'yearEnd': {
            'fullService': {'base': 0, 'perForm': 2, 'minimum': 25},
            'selfService': {'base': 0, 'perForm': 1, 'minimum': 15}
        }
    }
    
    # Get pricing category
    pricing_category = base_prices.get(tax_type, {}).get(service_type, {})
    if not pricing_category:
        # Fallback pricing
        return {
            'base_price': 100,
            'complexity_multiplier': 1.0,
            'final_price': 100,
            'currency': 'USD',
            'discount': 0
        }
    
    # Determine base price based on filing details
    base_price = pricing_category.get('base', 100)
    
    if tax_type == 'sales':
        period = filing_data.get('period', 'quarterly')
        if period == 'quarterly':
            base_price = pricing_category.get('quarterly', base_price)
        elif period == 'annual':
            base_price = pricing_category.get('annual', base_price)
        elif filing_data.get('multiState'):
            base_price = pricing_category.get('multiState', base_price)
    
    elif tax_type == 'payroll':
        form_type = filing_data.get('formType', '941')
        if form_type == '941':
            base_price = pricing_category.get('quarterly941', base_price)
        elif form_type == '940':
            base_price = pricing_category.get('annual940', base_price)
        elif form_type == 'complete':
            base_price = pricing_category.get('completePackage', base_price)
    
    elif tax_type == 'income':
        business_structure = filing_data.get('business_structure', 'sole_proprietor')
        if business_structure == 'sole_proprietor':
            base_price = pricing_category.get('soleProprietor', base_price)
        elif business_structure in ['llc', 's_corp']:
            base_price = pricing_category.get('llcSCorp', base_price)
        elif business_structure == 'c_corp':
            base_price = pricing_category.get('cCorp', base_price)
        
        # Add multi-state charges
        state_count = len(filing_data.get('states', [])) if filing_data else 1
        if state_count > 1:
            base_price += (state_count - 1) * pricing_category.get('perState', 0)
    
    elif tax_type == 'yearEnd':
        form_count = filing_data.get('formCount', 10)
        base_price = max(
            form_count * pricing_category.get('perForm', 1),
            pricing_category.get('minimum', 15)
        )
    
    # Calculate complexity multiplier
    complexity_multiplier = calculate_complexity_multiplier(tax_type, filing_data)
    
    # Check for developing country discount
    discount = 0
    if filing_data and filing_data.get('isDeveloping'):
        discount = 50  # 50% discount
    
    # Calculate final price with discount
    discount_multiplier = 1.0 - (discount / 100.0)
    final_price = base_price * complexity_multiplier * discount_multiplier
    
    return {
        'base_price': base_price,
        'complexity_multiplier': complexity_multiplier,
        'discount': discount,
        'final_price': round(final_price),
        'currency': 'USD'
    }


def calculate_complexity_multiplier(tax_type, filing_data):
    """
    Calculate complexity multiplier based on filing characteristics
    
    Args:
        tax_type: Type of tax filing
        filing_data: Dict containing filing details
        
    Returns:
        Decimal: Multiplier for pricing (1.0 to 3.0)
    """
    if not filing_data:
        return Decimal('1.0')
    
    multiplier = Decimal('1.0')
    
    # Sales tax complexity factors
    if tax_type == 'sales':
        # Multiple locations
        locations = filing_data.get('locations', [])
        if len(locations) > 5:
            multiplier += Decimal('0.5')
        elif len(locations) > 10:
            multiplier += Decimal('1.0')
        
        # High transaction volume
        total_sales = filing_data.get('total_sales', 0)
        if total_sales > 100000:
            multiplier += Decimal('0.3')
        elif total_sales > 500000:
            multiplier += Decimal('0.6')
    
    # Payroll tax complexity factors
    elif tax_type == 'payroll':
        # Number of employees
        employee_count = filing_data.get('employee_count', 0)
        if employee_count > 50:
            multiplier += Decimal('0.4')
        elif employee_count > 100:
            multiplier += Decimal('0.8')
        
        # Multiple states
        states = filing_data.get('states', [])
        if len(states) > 1:
            multiplier += Decimal('0.3') * (len(states) - 1)
    
    # Income tax complexity factors
    elif tax_type == 'income':
        # Business structure
        structure = filing_data.get('business_structure', '')
        if structure in ['partnership', 's-corp']:
            multiplier += Decimal('0.5')
        elif structure == 'c-corp':
            multiplier += Decimal('0.8')
        
        # Revenue level
        revenue = filing_data.get('annual_revenue', 0)
        if revenue > 1000000:
            multiplier += Decimal('0.4')
        elif revenue > 5000000:
            multiplier += Decimal('0.8')
    
    # Cap multiplier at 3.0
    return min(multiplier, Decimal('3.0'))


def validate_checkout_session(session_id):
    """
    Validate that a checkout session exists and is valid
    
    Args:
        session_id: Stripe checkout session ID
        
    Returns:
        dict: Contains is_valid and session details or error
    """
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        return {
            'is_valid': True,
            'session': {
                'id': session.id,
                'status': session.status,
                'payment_status': session.payment_status,
                'metadata': session.metadata,
                'amount_total': session.amount_total,
                'currency': session.currency,
            }
        }
    except stripe.error.StripeError as e:
        logger.error(f"Error validating checkout session: {str(e)}")
        return {
            'is_valid': False,
            'error': 'Invalid or expired session'
        }


def cancel_checkout_session(session_id):
    """
    Cancel a checkout session if it's still active
    
    Args:
        session_id: Stripe checkout session ID
        
    Returns:
        dict: Contains success status
    """
    try:
        session = stripe.checkout.Session.expire(session_id)
        
        logger.info(f"Cancelled checkout session: {session_id}")
        
        return {
            'success': True,
            'message': 'Payment session cancelled'
        }
    except stripe.error.StripeError as e:
        logger.error(f"Error cancelling checkout session: {str(e)}")
        return {
            'success': False,
            'error': 'Could not cancel session'
        }


# Import required modules at the top of the file
from django.utils import timezone
from datetime import timedelta