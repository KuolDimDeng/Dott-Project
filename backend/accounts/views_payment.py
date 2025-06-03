# Payment Processing Views
import stripe
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from .models_auth0 import Auth0User, OnboardingProgress
import logging

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    """Create a Stripe payment intent for subscription"""
    try:
        # Get user and tenant
        auth0_user = request.auth0_user
        user = Auth0User.objects.get(auth0_id=auth0_user['sub'])
        tenant = user.current_tenant
        
        if not tenant:
            return Response(
                {'error': 'No tenant found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate amount based on plan and interval
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
        
        if tenant.subscription_plan == 'free':
            return Response(
                {'error': 'Free plan does not require payment'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        amount = plan_prices.get(tenant.subscription_plan, {}).get(
            tenant.billing_interval, 0
        )
        
        if not amount:
            return Response(
                {'error': 'Invalid plan or billing interval'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create Stripe customer
        progress = OnboardingProgress.objects.get(user=user, tenant=tenant)
        
        if not progress.stripe_customer_id:
            # Create new Stripe customer
            customer = stripe.Customer.create(
                email=user.email,
                name=user.name,
                metadata={
                    'tenant_id': str(tenant.id),
                    'auth0_id': user.auth0_id
                }
            )
            progress.stripe_customer_id = customer.id
            progress.save()
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            customer=progress.stripe_customer_id,
            metadata={
                'tenant_id': str(tenant.id),
                'plan': tenant.subscription_plan,
                'interval': tenant.billing_interval
            },
            description=f"{tenant.subscription_plan.title()} Plan - {tenant.billing_interval.title()}"
        )
        
        return Response({
            'client_secret': intent.client_secret,
            'amount': amount,
            'plan': tenant.subscription_plan,
            'interval': tenant.billing_interval
        })
        
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
        
        # Get user and tenant
        auth0_user = request.auth0_user
        user = Auth0User.objects.get(auth0_id=auth0_user['sub'])
        tenant = user.current_tenant
        
        with transaction.atomic():
            # Verify payment intent
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status != 'succeeded':
                return Response(
                    {'error': 'Payment not completed'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create subscription in Stripe
            progress = OnboardingProgress.objects.get(user=user, tenant=tenant)
            
            # Define price IDs (you need to create these in Stripe dashboard)
            price_ids = {
                'professional': {
                    'monthly': settings.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
                    'annual': settings.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID
                },
                'enterprise': {
                    'monthly': settings.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
                    'annual': settings.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID
                }
            }
            
            price_id = price_ids.get(tenant.subscription_plan, {}).get(
                tenant.billing_interval
            )
            
            if price_id:
                subscription = stripe.Subscription.create(
                    customer=progress.stripe_customer_id,
                    items=[{'price': price_id}],
                    metadata={
                        'tenant_id': str(tenant.id)
                    }
                )
                
                progress.stripe_subscription_id = subscription.id
                progress.payment_completed = True
                progress.save()
                
                # Update tenant subscription status
                tenant.subscription_status = 'active'
                tenant.onboarding_step = 'setup'
                tenant.save()
            
            return Response({
                'success': True,
                'next_step': 'setup'
            })
            
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
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        # Invalid payload
        return Response(status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        # Payment succeeded
        logger.info(f"Payment succeeded for intent: {payment_intent['id']}")
        
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        # Update tenant subscription status
        try:
            progress = OnboardingProgress.objects.get(
                stripe_subscription_id=subscription['id']
            )
            tenant = progress.tenant
            
            # Map Stripe status to our status
            status_map = {
                'active': 'active',
                'past_due': 'past_due',
                'canceled': 'canceled',
                'incomplete': 'pending',
                'trialing': 'trialing'
            }
            
            tenant.subscription_status = status_map.get(
                subscription['status'], 'pending'
            )
            tenant.save()
            
        except OnboardingProgress.DoesNotExist:
            logger.warning(f"No progress found for subscription: {subscription['id']}")
    
    return Response(status=status.HTTP_200_OK)