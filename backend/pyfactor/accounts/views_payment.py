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
                'monthly': 1500,    # $15.00 in cents
                '6month': 7500,     # $75.00 in cents (17% discount)
                'annual': 14400,    # $144.00 in cents (20% discount)
                'yearly': 14400     # $144.00 in cents (20% discount)
            },
            'enterprise': {
                'monthly': 4500,    # $45.00 in cents
                '6month': 22500,    # $225.00 in cents (17% discount)
                'annual': 43200,    # $432.00 in cents (20% discount)
                'yearly': 43200     # $432.00 in cents (20% discount)
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

# Note: Stripe webhooks are handled in onboarding/api/views/webhook_views.py

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_subscription(request):
    """Create a Stripe subscription for the user"""
    logger.info("=== CREATE SUBSCRIPTION START ===")
    logger.info(f"Request headers: {dict(request.headers)}")
    logger.info(f"Request data: {request.data}")
    
    try:
        # Check if Stripe is configured
        if not stripe.api_key:
            logger.error("Stripe API key not configured!")
            return Response(
                {'error': 'Payment service not configured'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        else:
            logger.debug(f"Stripe configured with key: {stripe.api_key[:7]}...")
        
        # Get user from request
        user = request.user
        logger.info(f"Creating subscription for user: {user.email} (ID: {user.id})")
        
        # Get subscription details from request
        payment_method_id = request.data.get('payment_method_id')
        plan = request.data.get('plan', 'professional').lower()
        billing_cycle = request.data.get('billing_cycle', 'monthly').lower()
        
        logger.info(f"Subscription request: plan={plan}, billing_cycle={billing_cycle}, payment_method_id={payment_method_id[:10] if payment_method_id else 'None'}...")
        
        if not payment_method_id:
            return Response(
                {'error': 'Payment method ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Skip payment for free plan
        if plan == 'free':
            logger.info("Processing free plan subscription")
            # Update user's subscription status in OnboardingProgress
            try:
                from onboarding.models import OnboardingProgress
                logger.debug("Successfully imported OnboardingProgress model")
            except ImportError as e:
                logger.error(f"Failed to import OnboardingProgress: {str(e)}")
                
            try:
                from users.models import Business, Subscription
                logger.debug("Successfully imported Business and Subscription models")
            except ImportError as e:
                logger.error(f"Failed to import Business/Subscription models: {str(e)}")
            
            try:
                # Update onboarding progress
                logger.debug(f"Getting OnboardingProgress for user {user.id}")
                progress, created = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={'tenant_id': user.tenant_id if hasattr(user, 'tenant_id') else None}
                )
                logger.debug(f"OnboardingProgress {'created' if created else 'found'}: {progress.id}")
                
                progress.subscription_plan = 'free'
                progress.subscription_status = 'active'
                progress.save()
                logger.info("Updated OnboardingProgress with free plan")
                
                # Create or update subscription record
                if hasattr(user, 'userprofile') and user.userprofile.business:
                    business = user.userprofile.business
                    logger.debug(f"Found business: {business.id}")
                    subscription, created = Subscription.objects.get_or_create(
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
                    logger.info(f"{'Created' if created else 'Updated'} subscription for business {business.id}")
                else:
                    logger.warning("User has no userprofile or business associated")
                
            except Exception as e:
                logger.error(f"Error updating free plan status: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
            
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
        logger.debug("Setting up price map for Stripe plans")
        price_map = {
            'professional': {
                'monthly': getattr(settings, 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'price_1RZMDhFls6i75mQBM7o13PWb'),
                '6month': getattr(settings, 'STRIPE_PRICE_PROFESSIONAL_6MONTH', 'price_1RZMDhFls6i75mQBxxxxxx6M'),  # TODO: Replace with actual Stripe price ID
                'yearly': getattr(settings, 'STRIPE_PRICE_PROFESSIONAL_YEARLY', 'price_1RZMDhFls6i75mQB2M0DOulV'),
                'annual': getattr(settings, 'STRIPE_PRICE_PROFESSIONAL_YEARLY', 'price_1RZMDhFls6i75mQB2M0DOulV')  # Handle both 'yearly' and 'annual'
            },
            'enterprise': {
                'monthly': getattr(settings, 'STRIPE_PRICE_ENTERPRISE_MONTHLY', 'price_1RZMDhFls6i75mQB9kMjeKtx'),
                '6month': getattr(settings, 'STRIPE_PRICE_ENTERPRISE_6MONTH', 'price_1RZMDhFls6i75mQByyyyyy6M'),  # TODO: Replace with actual Stripe price ID
                'yearly': getattr(settings, 'STRIPE_PRICE_ENTERPRISE_YEARLY', 'price_1RZMDiFls6i75mQBqQwHnERW'),
                'annual': getattr(settings, 'STRIPE_PRICE_ENTERPRISE_YEARLY', 'price_1RZMDiFls6i75mQBqQwHnERW')  # Handle both 'yearly' and 'annual'
            }
        }
        logger.debug(f"Price map: {price_map}")
        
        # Get the appropriate price ID
        price_id = price_map.get(plan, {}).get(billing_cycle)
        logger.info(f"Selected price ID for {plan}/{billing_cycle}: {price_id}")
        
        if not price_id:
            logger.error(f"No price ID found for plan={plan}, billing_cycle={billing_cycle}")
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
                logger.debug(f"Creating new Stripe customer for email: {user.email}")
                customer_data = {
                    'email': user.email,
                    'name': getattr(user, 'name', user.email),
                    'metadata': {
                        'user_id': str(user.id),
                        'tenant_id': str(getattr(user, 'tenant_id', '')) if hasattr(user, 'tenant_id') else ''
                    }
                }
                logger.debug(f"Customer data: {customer_data}")
                
                customer = stripe.Customer.create(**customer_data)
                stripe_customer_id = customer.id
                logger.info(f"Created new Stripe customer for {user.email}: {stripe_customer_id}")
                    
            except stripe.error.StripeError as e:
                logger.error(f"Stripe error creating customer: {str(e)}")
                logger.error(f"Error type: {type(e).__name__}")
                if hasattr(e, 'user_message'):
                    logger.error(f"User message: {e.user_message}")
                return Response(
                    {'error': 'Failed to create customer account'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Attach payment method to customer
        try:
            logger.info(f"Attaching payment method {payment_method_id[:10]}... to customer {stripe_customer_id}")
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=stripe_customer_id
            )
            logger.debug("Payment method attached successfully")
            
            # Set as default payment method
            logger.debug("Setting as default payment method")
            stripe.Customer.modify(
                stripe_customer_id,
                invoice_settings={
                    'default_payment_method': payment_method_id
                }
            )
            logger.info("Payment method set as default successfully")
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error attaching payment method: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            if hasattr(e, 'code'):
                logger.error(f"Error code: {e.code}")
            if hasattr(e, 'user_message'):
                logger.error(f"User message: {e.user_message}")
            return Response(
                {'error': 'Failed to attach payment method'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Create subscription
        try:
            logger.info(f"Creating subscription for customer {stripe_customer_id}")
            subscription_data = {
                'customer': stripe_customer_id,
                'items': [{'price': price_id}],
                'payment_behavior': 'default_incomplete',
                'expand': ['latest_invoice.payment_intent'],
                'metadata': {
                    'user_id': str(user.id),
                    'plan': plan,
                    'billing_cycle': billing_cycle
                }
            }
            logger.debug(f"Subscription data: {subscription_data}")
            
            subscription = stripe.Subscription.create(**subscription_data)
            logger.info(f"Created subscription: {subscription.id} with status: {subscription.status}")
            
            # Update user's subscription status
            logger.info("Updating database models with subscription information")
            from onboarding.models import OnboardingProgress
            from users.models import Business, Subscription as SubscriptionModel
            
            try:
                # Update onboarding progress
                logger.debug(f"Updating OnboardingProgress for user {user.id}")
                progress, created = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={'tenant_id': user.tenant_id if hasattr(user, 'tenant_id') else None}
                )
                logger.debug(f"OnboardingProgress {'created' if created else 'found'}: {progress.id}")
                
                progress.subscription_plan = plan
                progress.subscription_status = subscription.status
                progress.payment_completed = True
                progress.payment_id = subscription.id
                progress.save()
                logger.info(f"OnboardingProgress updated with subscription {subscription.id}")
                
                # Try to create or update subscription record
                try:
                    logger.debug("Checking for user business profile")
                    if hasattr(user, 'userprofile') and hasattr(user.userprofile, 'business') and user.userprofile.business:
                        business = user.userprofile.business
                        logger.debug(f"Found business: {business.id}")
                        
                        sub_model, created = SubscriptionModel.objects.get_or_create(
                            business=business,
                            defaults={
                                'selected_plan': plan,
                                'is_active': True,
                                'billing_cycle': billing_cycle
                            }
                        )
                        logger.debug(f"Subscription model {'created' if created else 'found'}: {sub_model.id}")
                        
                        sub_model.selected_plan = plan
                        sub_model.is_active = subscription.status == 'active'
                        sub_model.billing_cycle = billing_cycle
                        # TODO: Add stripe_subscription_id field to Subscription model
                        # sub_model.stripe_subscription_id = subscription.id
                        sub_model.save()
                        logger.info(f"Subscription model updated for business {business.id}")
                    else:
                        logger.warning("User has no business profile, skipping Subscription model update")
                except Exception as e:
                    logger.error(f"Error updating subscription model: {str(e)}")
                    logger.error(f"Traceback: {traceback.format_exc()}")
                
            except Exception as e:
                logger.error(f"Error updating subscription status in database: {str(e)}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                # Continue - don't fail the subscription creation
            
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
            try:
                logger.debug(f"Checking 3D Secure requirement for subscription {subscription.id}")
                logger.debug(f"Latest invoice: {subscription.latest_invoice.id if subscription.latest_invoice else 'None'}")
                
                if subscription.latest_invoice and subscription.latest_invoice.payment_intent:
                    payment_intent_status = subscription.latest_invoice.payment_intent.status
                    logger.info(f"Payment intent status: {payment_intent_status}")
                    
                    if payment_intent_status == 'requires_action':
                        response_data['requiresAction'] = True
                        response_data['clientSecret'] = subscription.latest_invoice.payment_intent.client_secret
                        logger.info(f"3D Secure authentication required for subscription {subscription.id}")
                    else:
                        logger.info(f"No 3D Secure required, payment intent status: {payment_intent_status}")
                else:
                    logger.warning("No latest invoice or payment intent found on subscription")
            except Exception as e:
                logger.error(f"Error checking 3D Secure requirement: {str(e)}")
                # Continue without 3D Secure data
            
            logger.info(f"Subscription created successfully: {subscription.id}")
            logger.debug(f"Response data: {response_data}")
            return Response(response_data)
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            if hasattr(e, 'code'):
                logger.error(f"Error code: {e.code}")
            if hasattr(e, 'param'):
                logger.error(f"Error param: {e.param}")
            if hasattr(e, 'user_message'):
                logger.error(f"User message: {e.user_message}")
            if hasattr(e, 'json_body'):
                logger.error(f"JSON body: {e.json_body}")
            
            # Provide user-friendly error message
            error_message = 'Failed to create subscription'
            if hasattr(e, 'user_message') and e.user_message:
                error_message = e.user_message
            elif hasattr(e, 'code'):
                if e.code == 'card_declined':
                    error_message = 'Your card was declined'
                elif e.code == 'insufficient_funds':
                    error_message = 'Your card has insufficient funds'
                elif e.code == 'invalid_payment_method':
                    error_message = 'Invalid payment method'
            
            return Response(
                {'error': error_message},
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