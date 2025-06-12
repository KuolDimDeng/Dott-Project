# Payment Processing Views
import stripe
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    """Create a Stripe payment intent for subscription"""
    try:
        # Get user from request
        user = request.user
        
        # Calculate amount based on plan and interval
        plan = request.data.get('plan', 'professional')
        interval = request.data.get('interval', 'monthly')
        
        plan_prices = {
            'professional': {
                'monthly': 1500,  # $15.00 in cents
                'annual': 16200   # $162.00 (10% discount)
            },
            'enterprise': {
                'monthly': 3500,  # $35.00 in cents
                'annual': 37800   # $378.00 (10% discount)
            }
        }
        
        if plan == 'free':
            return Response(
                {'error': 'Free plan does not require payment'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        amount = plan_prices.get(plan, {}).get(interval, 0)
        
        if not amount:
            return Response(
                {'error': 'Invalid plan or billing interval'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            metadata={
                'user_id': str(user.id),
                'plan': plan,
                'interval': interval
            },
            description=f"{plan.title()} Plan - {interval.title()}"
        )
        
        return Response({
            'client_secret': intent.client_secret,
            'amount': amount,
            'plan': plan,
            'interval': interval
        })
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating payment intent: {str(e)}")
        return Response(
            {'error': 'Payment service error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Error creating payment intent: {str(e)}")
        return Response(
            {'error': 'Failed to create payment intent'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request):
    """Confirm payment and create subscription"""
    try:
        payment_intent_id = request.data.get('payment_intent_id')
        if not payment_intent_id:
            return Response(
                {'error': 'Payment intent ID required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify payment intent
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status != 'succeeded':
            return Response(
                {'error': 'Payment not completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Create subscription record in database
        # This would typically update the user's subscription status
        
        return Response({
            'success': True,
            'message': 'Payment confirmed successfully'
        })
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error confirming payment: {str(e)}")
        return Response(
            {'error': 'Payment service error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Error confirming payment: {str(e)}")
        return Response(
            {'error': 'Failed to confirm payment'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def stripe_webhook(request):
    """Handle Stripe webhooks"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
    
    if not webhook_secret:
        logger.warning("STRIPE_WEBHOOK_SECRET not configured")
        return Response(status=status.HTTP_200_OK)
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        # Invalid payload
        logger.error("Invalid webhook payload")
        return Response(status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        logger.error("Invalid webhook signature")
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        # Payment succeeded
        logger.info(f"Payment succeeded for intent: {payment_intent['id']}")
        
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        # Update subscription status
        logger.info(f"Subscription updated: {subscription['id']}")
    
    return Response(status=status.HTTP_200_OK)