#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/api/views/webhook_views.py
# onboarding/webhook_views.py
import stripe
import logging
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.response import Response

from onboarding.models import OnboardingProgress
from users.models import Subscription, User

logger = logging.getLogger(__name__)

@csrf_exempt
@require_POST
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {str(e)}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {str(e)}")
        return HttpResponse(status=400)

    try:
        # Handle checkout session completed
        if event.type == 'checkout.session.completed':
            session = event.data.object
            
            # Get user from client reference ID
            try:
                user = User.objects.get(id=session.client_reference_id)
            except User.DoesNotExist:
                logger.error(f"User not found for client_reference_id: {session.client_reference_id}")
                return HttpResponse(status=404)

            # Get onboarding progress
            try:
                progress = OnboardingProgress.objects.get(user=user)
            except OnboardingProgress.DoesNotExist:
                logger.error(f"OnboardingProgress not found for user: {user.id}")
                return HttpResponse(status=404)

            # Update subscription and trigger setup process
            try:
                # 1. Update subscription status
                subscription = Subscription.objects.get(business=progress.business)
                subscription.is_active = True
                subscription.stripe_subscription_id = session.subscription
                subscription.save()

                # 2. Update onboarding progress
                progress.payment_completed = True
                progress.save()

                # 3. Start schema setup in background
                from onboarding.tasks import setup_user_schema_task
                setup_user_schema_task.delay(
                    user_id=str(user.id),
                    business_id=str(progress.business.id)
                )

                logger.info(f"Payment completed and setup initiated for user {user.id}")
                return HttpResponse(status=200)

            except Subscription.DoesNotExist:
                logger.error(f"Subscription not found for business: {progress.business.id}")
                return HttpResponse(status=404)

        elif event.type in ['checkout.session.expired', 'payment_intent.payment_failed']:
            session = event.data.object
            
            try:
                user = User.objects.get(id=session.client_reference_id)
                progress = OnboardingProgress.objects.get(user=user)
                
                # Reset payment and subscription status
                progress.payment_completed = False
                progress.current_step = 'subscription'  # Return to subscription selection
                progress.next_step = 'payment'
                progress.save()

                # If subscription was created, deactivate it
                try:
                    subscription = Subscription.objects.get(business=progress.business)
                    subscription.is_active = False
                    subscription.save()
                except Subscription.DoesNotExist:
                    pass

                event_type = 'expired' if event.type == 'checkout.session.expired' else 'failed'
                logger.info(f"Payment {event_type} for user {user.id}")
                return HttpResponse(status=200)
                
            except (User.DoesNotExist, OnboardingProgress.DoesNotExist) as e:
                logger.error(f"Error handling payment failure: {str(e)}")
                return HttpResponse(status=404)
        
        # Handle subscription created/updated
        elif event.type in ['customer.subscription.created', 'customer.subscription.updated']:
            subscription = event.data.object
            
            try:
                # Get user from metadata or customer email
                user_id = subscription.metadata.get('user_id')
                if not user_id:
                    # Try to find user by customer email
                    import stripe as stripe_api
                    stripe_api.api_key = settings.STRIPE_SECRET_KEY
                    customer = stripe_api.Customer.retrieve(subscription.customer)
                    user = User.objects.filter(email=customer.email).first()
                    if not user:
                        logger.error(f"No user found for subscription {subscription.id}")
                        return HttpResponse(status=200)  # Return 200 to prevent retries
                else:
                    user = User.objects.get(id=user_id)
                
                # Update user's subscription status
                progress = OnboardingProgress.objects.filter(user=user).first()
                if progress:
                    progress.subscription_status = subscription.status
                    if subscription.status == 'active':
                        progress.payment_completed = True
                        progress.onboarding_status = 'complete'
                        progress.setup_completed = True
                    progress.save()
                    logger.info(f"Updated subscription status for user {user.id}: {subscription.status}")
                
                # Update subscription model if it exists
                if progress and progress.business:
                    sub_model = Subscription.objects.filter(business=progress.business).first()
                    if sub_model:
                        sub_model.is_active = (subscription.status == 'active')
                        sub_model.stripe_subscription_id = subscription.id
                        sub_model.save()
                        logger.info(f"Updated subscription model for business {progress.business.id}")
                
                return HttpResponse(status=200)
                
            except Exception as e:
                logger.error(f"Error handling subscription update: {str(e)}")
                return HttpResponse(status=200)  # Return 200 to prevent retries
        
        # Handle subscription cancelled/deleted
        elif event.type == 'customer.subscription.deleted':
            subscription = event.data.object
            
            try:
                # Get user from metadata
                user_id = subscription.metadata.get('user_id')
                if user_id:
                    user = User.objects.get(id=user_id)
                    progress = OnboardingProgress.objects.filter(user=user).first()
                    if progress:
                        progress.subscription_status = 'cancelled'
                        progress.save()
                        
                        # Deactivate subscription model
                        if progress.business:
                            sub_model = Subscription.objects.filter(business=progress.business).first()
                            if sub_model:
                                sub_model.is_active = False
                                sub_model.save()
                    
                    logger.info(f"Subscription cancelled for user {user.id}")
                
                return HttpResponse(status=200)
                
            except Exception as e:
                logger.error(f"Error handling subscription cancellation: {str(e)}")
                return HttpResponse(status=200)  # Return 200 to prevent retries
        
        # Handle invoice payment succeeded
        elif event.type == 'invoice.payment_succeeded':
            invoice = event.data.object
            subscription_id = invoice.subscription
            logger.info(f"Payment succeeded for invoice {invoice.id}, subscription: {subscription_id}, amount: ${invoice.amount_paid / 100}")
            
            # Update subscription payment date if needed
            if subscription_id:
                try:
                    from users.models import Subscription
                    # Find subscription by stripe ID
                    subscription = Subscription.objects.filter(stripe_subscription_id=subscription_id).first()
                    
                    if subscription:
                        # Reactivate subscription (clears grace period if any)
                        subscription.reactivate_subscription()
                        logger.info(f"Reactivated subscription {subscription.id} after successful payment")
                        
                        # TODO: Send email notification about successful payment and reactivation
                        # send_payment_success_notification(subscription.business.owner_email)
                        
                    else:
                        logger.error(f"Could not find subscription with Stripe ID: {subscription_id}")
                        
                except Exception as e:
                    logger.error(f"Error updating payment success: {str(e)}")
            
            return HttpResponse(status=200)
        
        # Handle invoice payment failed
        elif event.type == 'invoice.payment_failed':
            invoice = event.data.object
            subscription_id = invoice.subscription
            logger.warning(f"Payment failed for invoice {invoice.id}, subscription: {subscription_id}, amount: ${invoice.amount_due / 100}")
            
            try:
                # Find the subscription in our database
                from users.models import Subscription
                subscription = Subscription.objects.filter(stripe_subscription_id=subscription_id).first()
                
                if subscription:
                    # Determine grace period length based on attempt count
                    grace_period_days = 7  # Default 7 days
                    if subscription.failed_payment_count >= 2:
                        grace_period_days = 3  # Shorter grace period for repeated failures
                    
                    # Start grace period
                    subscription.start_grace_period(days=grace_period_days)
                    
                    logger.info(f"Started {grace_period_days}-day grace period for subscription {subscription.id} (attempt #{subscription.failed_payment_count})")
                    
                    # TODO: Send email notification to user about failed payment and grace period
                    # send_payment_failed_notification(subscription.business.owner_email, grace_period_days)
                    
                else:
                    logger.error(f"Could not find subscription with Stripe ID: {subscription_id}")
                    
            except Exception as e:
                logger.error(f"Error handling payment failure: {str(e)}")
            
            return HttpResponse(status=200)
        
        # Handle payment intent succeeded (one-time payments)
        elif event.type == 'payment_intent.succeeded':
            payment_intent = event.data.object
            logger.info(f"Payment intent succeeded: {payment_intent.id}, amount: ${payment_intent.amount / 100}")
            return HttpResponse(status=200)
        
        # Unhandled event type
        else:
            logger.info(f"Unhandled webhook event type: {event.type}")

        return HttpResponse(status=200)

    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        return HttpResponse(status=500)
