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

# Log Stripe configuration at module load
if not stripe.api_key:
    logger.error("STRIPE_SECRET_KEY is not configured!")
else:
    logger.info(f"Stripe configured with key: {stripe.api_key[:7]}...")

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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_subscription(request):
    """Create a Stripe subscription for the user"""
    try:
        # Get user from request
        user = request.user
        
        # Get subscription details from request
        payment_method_id = request.data.get('payment_method_id')
        plan = request.data.get('plan', 'professional').lower()
        billing_cycle = request.data.get('billing_cycle', 'monthly').lower()
        
        if not payment_method_id:
            return Response(
                {'error': 'Payment method ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Skip payment for free plan
        if plan == 'free':
            # Update user's subscription status in OnboardingProgress
            from onboarding.models import OnboardingProgress
            from users.models import Business, Subscription
            
            try:
                # Update onboarding progress
                progress, _ = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={'tenant_id': user.tenant_id if hasattr(user, 'tenant_id') else None}
                )
                progress.subscription_plan = 'free'
                progress.subscription_status = 'active'
                progress.save()
                
                # Create or update subscription record
                if hasattr(user, 'userprofile') and user.userprofile.business:
                    business = user.userprofile.business
                    subscription, _ = Subscription.objects.get_or_create(
                        business=business,
                        defaults={
                            'selected_plan': 'free',
                            'is_active': True,
                            'billing_cycle': 'monthly'
                        }
                    )
                    subscription.selected_plan = 'free'
                    subscription.is_active = True
                    subscription.save()
                
            except Exception as e:
                logger.error(f"Error updating free plan status: {str(e)}")
            
            return Response({
                'success': True,
                'subscription': {
                    'id': 'free_plan',
                    'status': 'active',
                    'plan': 'free',
                    'billing_cycle': 'none'
                }
            })
        
        # Map plan names to Stripe price IDs
        # These should be configured in your Stripe dashboard and stored in settings
        price_map = {
            'professional': {
                'monthly': getattr(settings, 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'price_1RZMDhFls6i75mQBM7o13PWb'),
                'yearly': getattr(settings, 'STRIPE_PRICE_PROFESSIONAL_YEARLY', 'price_1RZMDhFls6i75mQB2M0DOulV')
            },
            'enterprise': {
                'monthly': getattr(settings, 'STRIPE_PRICE_ENTERPRISE_MONTHLY', 'price_1RZMDhFls6i75mQB9kMjeKtx'),
                'yearly': getattr(settings, 'STRIPE_PRICE_ENTERPRISE_YEARLY', 'price_1RZMDiFls6i75mQBqQwHnERW')
            }
        }
        
        # Get the appropriate price ID
        price_id = price_map.get(plan, {}).get(billing_cycle)
        if not price_id:
            return Response(
                {'error': 'Invalid plan or billing cycle'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or retrieve Stripe customer
        stripe_customer_id = None
        
        # Try to get existing customer ID from user profile or custom fields
        try:
            # Check various possible locations for stripe_customer_id
            if hasattr(user, 'stripe_customer_id') and user.stripe_customer_id:
                stripe_customer_id = user.stripe_customer_id
            elif hasattr(user, 'userprofile') and hasattr(user.userprofile, 'stripe_customer_id'):
                stripe_customer_id = user.userprofile.stripe_customer_id
            else:
                # Search for existing customer by email
                customers = stripe.Customer.list(email=user.email, limit=1)
                if customers.data:
                    stripe_customer_id = customers.data[0].id
                    logger.info(f"Found existing Stripe customer for {user.email}: {stripe_customer_id}")
        except Exception as e:
            logger.warning(f"Error checking for existing customer: {str(e)}")
        
        # Create new customer if none exists
        if not stripe_customer_id:
            try:
                customer = stripe.Customer.create(
                    email=user.email,
                    name=getattr(user, 'name', user.email),
                    metadata={
                        'user_id': str(user.id),
                        'tenant_id': str(getattr(user, 'tenant_id', '')) if hasattr(user, 'tenant_id') else ''
                    }
                )
                stripe_customer_id = customer.id
                logger.info(f"Created new Stripe customer for {user.email}: {stripe_customer_id}")
                    
            except stripe.error.StripeError as e:
                logger.error(f"Error creating Stripe customer: {str(e)}")
                return Response(
                    {'error': 'Failed to create customer account'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Attach payment method to customer
        try:
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=stripe_customer_id
            )
            
            # Set as default payment method
            stripe.Customer.modify(
                stripe_customer_id,
                invoice_settings={
                    'default_payment_method': payment_method_id
                }
            )
        except stripe.error.StripeError as e:
            logger.error(f"Error attaching payment method: {str(e)}")
            return Response(
                {'error': 'Failed to attach payment method'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Create subscription
        try:
            subscription = stripe.Subscription.create(
                customer=stripe_customer_id,
                items=[{'price': price_id}],
                payment_behavior='default_incomplete',
                expand=['latest_invoice.payment_intent'],
                metadata={
                    'user_id': str(user.id),
                    'plan': plan,
                    'billing_cycle': billing_cycle
                }
            )
            
            # Update user's subscription status
            from onboarding.models import OnboardingProgress
            from users.models import Business, Subscription as SubscriptionModel
            
            try:
                # Update onboarding progress
                progress, _ = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={'tenant_id': user.tenant_id if hasattr(user, 'tenant_id') else None}
                )
                progress.subscription_plan = plan
                progress.subscription_status = subscription.status
                progress.payment_completed = True
                progress.payment_id = subscription.id
                progress.save()
                
                # Try to create or update subscription record
                try:
                    if hasattr(user, 'userprofile') and hasattr(user.userprofile, 'business') and user.userprofile.business:
                        business = user.userprofile.business
                        sub_model, _ = SubscriptionModel.objects.get_or_create(
                            business=business,
                            defaults={
                                'selected_plan': plan,
                                'is_active': True,
                                'billing_cycle': billing_cycle
                            }
                        )
                        sub_model.selected_plan = plan
                        sub_model.is_active = subscription.status == 'active'
                        sub_model.billing_cycle = billing_cycle
                        # TODO: Add stripe_subscription_id field to Subscription model
                        # sub_model.stripe_subscription_id = subscription.id
                        sub_model.save()
                except Exception as e:
                    logger.warning(f"Could not update subscription model: {str(e)}")
                
            except Exception as e:
                logger.error(f"Error updating subscription status: {str(e)}")
            
            # Check if payment needs further action (3D Secure)
            response_data = {
                'success': True,
                'subscription': {
                    'id': subscription.id,
                    'status': subscription.status,
                    'plan': plan,
                    'billing_cycle': billing_cycle
                }
            }
            
            # Check if 3D Secure authentication is required
            if subscription.latest_invoice.payment_intent.status == 'requires_action':
                response_data['requiresAction'] = True
                response_data['clientSecret'] = subscription.latest_invoice.payment_intent.client_secret
            
            return Response(response_data)
            
        except stripe.error.StripeError as e:
            logger.error(f"Error creating subscription: {str(e)}")
            return Response(
                {'error': f'Failed to create subscription: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    except Exception as e:
        import traceback
        logger.error(f"Unexpected error in create_subscription: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error(f"Request data: {request.data}")
        logger.error(f"User: {request.user.email if hasattr(request, 'user') else 'No user'}")
        return Response(
            {'error': 'An unexpected error occurred'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )