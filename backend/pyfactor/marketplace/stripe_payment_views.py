"""
Stripe payment views for marketplace
Handles direct payment intent creation without requiring an order first
"""
import stripe
import logging
import os
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)

# Get Stripe API key from environment or settings
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY') or getattr(settings, 'STRIPE_SECRET_KEY', '')

# Initialize Stripe with the API key
if STRIPE_SECRET_KEY and not STRIPE_SECRET_KEY.startswith('placeholder'):
    stripe.api_key = STRIPE_SECRET_KEY
    logger.info(f"Stripe initialized with key starting with: {STRIPE_SECRET_KEY[:7]}")
else:
    logger.error("WARNING: Stripe API key not configured properly!")
    logger.error(f"STRIPE_SECRET_KEY value: {STRIPE_SECRET_KEY[:20] if STRIPE_SECRET_KEY else 'None'}")

@api_view(['POST'])
@permission_classes([AllowAny])  # Allow any since payment will be tied to order creation
def create_marketplace_payment_intent(request):
    """
    Create a Stripe payment intent for marketplace orders
    This doesn't require an order ID - the order will be created after payment
    """
    try:
        # Check if Stripe API key is configured
        if not stripe.api_key or stripe.api_key.startswith('placeholder'):
            logger.error("Stripe API key not configured when attempting to create payment intent")
            return Response({
                'success': False,
                'error': 'Payment service is not configured. Please contact support.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        amount = request.data.get('amount', 0)
        currency = request.data.get('currency', 'usd').lower()
        metadata = request.data.get('metadata', {})
        description = request.data.get('description', 'Marketplace Order')

        # Validate amount
        if amount <= 0:
            return Response({
                'success': False,
                'error': 'Invalid amount'
            }, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"Creating payment intent for amount: {amount} {currency}")

        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(amount),  # Amount should already be in cents
            currency=currency,
            metadata=metadata,
            description=description,
            automatic_payment_methods={
                'enabled': True,
                'allow_redirects': 'never'
            }
        )

        return Response({
            'success': True,
            'client_secret': intent.client_secret,
            'payment_intent_id': intent.id,
            'amount': amount,
            'currency': currency
        })

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating payment intent: {str(e)}")
        return Response({
            'success': False,
            'error': str(e.user_message if hasattr(e, 'user_message') else str(e))
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error creating payment intent: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to create payment intent'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def initiate_mtn_payment(request):
    """
    Initiate MTN Mobile Money payment for marketplace
    """
    try:
        amount = request.data.get('amount', 0)
        phone_number = request.data.get('phone_number', '')
        currency = request.data.get('currency', 'SSP')
        metadata = request.data.get('metadata', {})
        description = request.data.get('description', 'Marketplace Order')

        # Validate inputs
        if amount <= 0:
            return Response({
                'success': False,
                'error': 'Invalid amount'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not phone_number:
            return Response({
                'success': False,
                'error': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Format phone number
        formatted_phone = phone_number.replace(' ', '').replace('-', '')
        if not formatted_phone.startswith('+'):
            if not formatted_phone.startswith('211'):
                formatted_phone = '+211' + formatted_phone
            else:
                formatted_phone = '+' + formatted_phone

        # In production, this would integrate with MTN MoMo API
        # For now, return a mock response for testing
        import uuid
        transaction_id = str(uuid.uuid4())

        # Store transaction for tracking (in production, this would go to database)
        # For now, we'll simulate the payment flow

        return Response({
            'success': True,
            'transaction_id': transaction_id,
            'reference_id': f'MKT-{transaction_id[:8]}',
            'status': 'pending',
            'message': 'Payment request sent. Please check your phone to confirm.'
        })

    except Exception as e:
        logger.error(f"Error initiating MTN payment: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to initiate payment'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def check_mtn_payment_status(request, transaction_id):
    """
    Check MTN payment status
    """
    try:
        # In production, check actual payment status from MTN API or database
        # For testing, simulate different statuses
        import random
        import time

        # Simulate processing time
        statuses = ['pending', 'pending', 'completed', 'failed']
        status_choice = random.choice(statuses)

        return Response({
            'success': True,
            'status': status_choice,
            'completed': status_choice == 'completed',
            'failed': status_choice == 'failed',
            'transaction_id': transaction_id
        })

    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to check payment status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)