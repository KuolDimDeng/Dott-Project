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
from business.models import Subscription
from users.models import User

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

                # 3. Start database setup in background
                from onboarding.tasks import setup_user_database_task
                setup_user_database_task.delay(
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

        return HttpResponse(status=200)

    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        return HttpResponse(status=500)
