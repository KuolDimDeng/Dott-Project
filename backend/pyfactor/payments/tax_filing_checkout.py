"""
Tax filing payment checkout - supports both Stripe and M-Pesa
"""
import logging
import stripe
from decimal import Decimal
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from users.models import Business
from payroll.paystack_integration import paystack_service, PaystackError
from taxes.models import TaxFiling

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_filing_session(request):
    """
    Create a payment session for tax filing - supports Stripe and M-Pesa
    
    Expected data:
    {
        "filing_id": "uuid",
        "amount": 1000,  # in cents for USD, smallest unit for other currencies
        "description": "Tax filing description",
        "metadata": {},
        "success_url": "https://...",
        "cancel_url": "https://...",
        "payment_method": "stripe" or "mpesa"
    }
    """
    user = request.user
    
    # Extract data
    filing_id = request.data.get('filing_id')
    amount = request.data.get('amount')
    description = request.data.get('description', 'Tax Filing Service')
    metadata = request.data.get('metadata', {})
    success_url = request.data.get('success_url')
    cancel_url = request.data.get('cancel_url')
    payment_method = request.data.get('payment_method', 'stripe')
    
    # Validate required fields
    if not all([filing_id, amount, success_url, cancel_url]):
        return Response({
            'error': 'Missing required fields: filing_id, amount, success_url, cancel_url'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get user's business for country detection
        business = Business.objects.filter(user=user).first()
        country = business.country if business else 'US'
        
        # Apply developing country discount if not already applied
        if hasattr(request, 'tenant_id'):
            metadata['tenant_id'] = str(request.tenant_id)
        
        # Handle M-Pesa for Kenya
        if payment_method == 'mpesa' or (country == 'KE' and payment_method != 'stripe'):
            return create_mpesa_session(
                user, filing_id, amount, description, metadata, success_url
            )
        
        # Default to Stripe
        return create_stripe_session(
            user, filing_id, amount, description, metadata, success_url, cancel_url
        )
        
    except Exception as e:
        logger.error(f"Error creating filing payment session: {str(e)}", exc_info=True)
        return Response({
            'error': 'Failed to create payment session'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def create_stripe_session(user, filing_id, amount, description, metadata, success_url, cancel_url):
    """Create Stripe checkout session"""
    try:
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': description,
                    },
                    'unit_amount': amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                **metadata,
                'filing_id': filing_id,
                'user_email': user.email
            },
            customer_email=user.email,
        )
        
        return Response({
            'url': session.url,
            'sessionId': session.id,
            'provider': 'stripe'
        }, status=status.HTTP_200_OK)
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        return Response({
            'error': 'Payment processing error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def create_mpesa_session(user, filing_id, amount, description, metadata, success_url):
    """Create M-Pesa payment session via Paystack"""
    try:
        # Get user's phone number from profile
        phone_number = None
        if hasattr(user, 'userprofile'):
            phone_number = user.userprofile.phone_number
        
        if not phone_number:
            return Response({
                'error': 'Phone number required for M-Pesa payment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Convert amount to KES (assuming 1 USD = 150 KES for now)
        # In production, use real exchange rates
        kes_amount = int(amount * 1.5)  # Convert cents to KES
        
        # Create Paystack charge
        charge_data = paystack_service.create_charge(
            email=user.email,
            amount=kes_amount,
            currency='KES',
            mobile_money={
                'phone': phone_number,
                'provider': 'mpesa'
            },
            metadata={
                **metadata,
                'filing_id': filing_id,
                'type': 'tax_filing'
            },
            callback_url=success_url
        )
        
        return Response({
            'url': charge_data.get('authorization_url'),
            'reference': charge_data.get('reference'),
            'provider': 'mpesa'
        }, status=status.HTTP_200_OK)
        
    except PaystackError as e:
        logger.error(f"Paystack error: {str(e)}")
        return Response({
            'error': 'Payment processing error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)