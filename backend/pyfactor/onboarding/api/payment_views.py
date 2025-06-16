from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from onboarding.models import OnboardingProgress
from custom_auth.models import Tenant
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payment_pending_view(request):
    """
    Mark payment as pending for paid tier users.
    This prevents them from accessing the dashboard until payment is complete.
    """
    try:
        user = request.user
        logger.info(f"[PaymentPending] Processing for user: {user.email}")
        
        # Get the selected plan
        selected_plan = request.data.get('selected_plan', 'free')
        billing_cycle = request.data.get('billing_cycle', 'monthly')
        
        # Only process for paid tiers
        if selected_plan == 'free':
            return Response({
                'status': 'skipped',
                'message': 'No payment required for free tier'
            })
        
        # Get or create onboarding progress
        tenant_id = getattr(user, 'tenant_id', None)
        if not tenant_id and hasattr(user, 'tenant'):
            tenant_id = user.tenant.id if user.tenant else None
            
        if not tenant_id:
            # Try to find tenant by owner_id
            try:
                tenant = Tenant.objects.filter(owner_id=str(user.id)).first()
                if tenant:
                    tenant_id = tenant.id
            except Exception as e:
                logger.error(f"[PaymentPending] Error finding tenant: {str(e)}")
        
        onboarding_progress, created = OnboardingProgress.objects.get_or_create(
            user=user,
            defaults={
                'tenant_id': tenant_id,
                'current_step': 'payment',
                'onboarding_status': 'payment',
                'selected_plan': selected_plan,
                'subscription_plan': selected_plan,
                'billing_cycle': billing_cycle
            }
        )
        
        # Update to payment pending status
        onboarding_progress.current_step = 'payment'
        onboarding_progress.onboarding_status = 'payment'
        onboarding_progress.payment_completed = False
        onboarding_progress.selected_plan = selected_plan
        onboarding_progress.subscription_plan = selected_plan
        onboarding_progress.billing_cycle = billing_cycle
        onboarding_progress.updated_at = timezone.now()
        
        # Mark payment step as the last active step
        onboarding_progress.last_active_step = 'payment'
        
        # Save changes
        onboarding_progress.save()
        
        logger.info(f"[PaymentPending] Marked payment pending for user {user.email}, plan: {selected_plan}")
        
        return Response({
            'status': 'success',
            'message': 'Payment marked as pending',
            'data': {
                'user_id': str(user.id),
                'selected_plan': selected_plan,
                'billing_cycle': billing_cycle,
                'current_step': 'payment',
                'payment_completed': False
            }
        })
        
    except Exception as e:
        logger.error(f"[PaymentPending] Error: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_payment_view(request):
    """
    Complete onboarding after payment verification for paid tiers.
    This is called after successful Stripe payment.
    """
    try:
        user = request.user
        logger.info(f"[CompletePayment] Processing for user: {user.email}")
        
        # Get payment details
        payment_intent_id = request.data.get('payment_intent_id')
        subscription_id = request.data.get('subscription_id')
        tenant_id = request.data.get('tenant_id')
        
        if not payment_intent_id and not subscription_id:
            return Response({
                'status': 'error',
                'message': 'Payment verification required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get onboarding progress
        try:
            onboarding_progress = OnboardingProgress.objects.get(user=user)
        except OnboardingProgress.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Onboarding progress not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update payment status
        onboarding_progress.payment_completed = True
        onboarding_progress.payment_id = payment_intent_id
        onboarding_progress.payment_method = 'stripe'
        onboarding_progress.payment_timestamp = timezone.now()
        onboarding_progress.subscription_status = 'active'
        
        # Mark onboarding as complete
        onboarding_progress.current_step = 'complete'
        onboarding_progress.onboarding_status = 'complete'
        onboarding_progress.completed_at = timezone.now()
        onboarding_progress.setup_completed = True
        onboarding_progress.setup_timestamp = timezone.now()
        
        # Ensure tenant_id is set
        if tenant_id:
            onboarding_progress.tenant_id = tenant_id
        
        # Save all changes
        onboarding_progress.save()
        
        # Update user's onboarding status
        if hasattr(user, 'needs_onboarding'):
            user.needs_onboarding = False
            user.save(update_fields=['needs_onboarding'])
        
        logger.info(f"[CompletePayment] Payment verified and onboarding completed for user {user.email}")
        
        return Response({
            'status': 'success',
            'message': 'Payment verified and onboarding completed',
            'data': {
                'user_id': str(user.id),
                'tenant_id': str(onboarding_progress.tenant_id) if onboarding_progress.tenant_id else None,
                'subscription_plan': onboarding_progress.subscription_plan,
                'payment_completed': True,
                'onboarding_completed': True
            }
        })
        
    except Exception as e:
        logger.error(f"[CompletePayment] Error: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
