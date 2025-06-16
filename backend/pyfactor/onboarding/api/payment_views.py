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
        
        # Also add 'complete' to completed_steps if not already there
        completed_steps = onboarding_progress.completed_steps or []
        if 'complete' not in completed_steps:
            completed_steps.append('complete')
        if 'setup' not in completed_steps:
            completed_steps.append('setup')
        onboarding_progress.completed_steps = completed_steps
        
        # Ensure tenant_id is set
        if tenant_id:
            onboarding_progress.tenant_id = tenant_id
        elif not onboarding_progress.tenant_id:
            # Try to get tenant_id from user
            if hasattr(user, 'tenant_id'):
                onboarding_progress.tenant_id = user.tenant_id
            elif hasattr(user, 'tenant'):
                onboarding_progress.tenant_id = user.tenant.id if user.tenant else None
        
        # Log the state before save
        logger.info(f"[CompletePayment] Onboarding status before save - status: {onboarding_progress.onboarding_status}, payment_completed: {onboarding_progress.payment_completed}, current_step: {onboarding_progress.current_step}")
        
        # Save all changes with explicit field update
        onboarding_progress.save(update_fields=[
            'payment_completed', 'payment_id', 'payment_method', 'payment_timestamp',
            'subscription_status', 'current_step', 'onboarding_status', 'completed_at',
            'setup_completed', 'setup_timestamp', 'completed_steps', 'tenant_id'
        ])
        
        # Verify the save worked
        onboarding_progress.refresh_from_db()
        logger.info(f"[CompletePayment] Onboarding status after save - status: {onboarding_progress.onboarding_status}, payment_completed: {onboarding_progress.payment_completed}, current_step: {onboarding_progress.current_step}, setup_completed: {onboarding_progress.setup_completed}")
        
        # Update user's onboarding status if the field exists
        if hasattr(user, 'needs_onboarding'):
            user.needs_onboarding = False
            user.save(update_fields=['needs_onboarding'])
            logger.info(f"[CompletePayment] Updated user.needs_onboarding to False for {user.email}")
        
        # Update session if using session manager
        try:
            from session_manager.models import UserSession
            from session_manager.services import session_service
            
            # Get current session from headers or cookies
            session_token = request.headers.get('X-Session-Token')
            if not session_token:
                # Try to get from cookies
                session_token = request.COOKIES.get('session_token')
            
            if session_token:
                # Update session via service
                updated_session = session_service.update_session(
                    session_token,
                    needs_onboarding=False,
                    onboarding_completed=True,
                    onboarding_step='completed',
                    subscription_plan=onboarding_progress.subscription_plan,
                    subscription_status='active'
                )
                if updated_session:
                    logger.info(f"[CompletePayment] Updated session manager for user {user.email}")
                else:
                    logger.warning(f"[CompletePayment] Failed to update session manager for user {user.email}")
            else:
                logger.info(f"[CompletePayment] No session token found, skipping session manager update")
                
            # Also try to update via session API directly
            # This handles cases where the session token might be in a different format
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE session_manager_usersession 
                        SET needs_onboarding = false,
                            onboarding_completed = true,
                            onboarding_step = 'completed',
                            subscription_plan = %s,
                            subscription_status = 'active',
                            updated_at = NOW()
                        WHERE user_id = %s
                        AND expires_at > NOW()
                    """, [onboarding_progress.subscription_plan, user.id])
                    
                    if cursor.rowcount > 0:
                        logger.info(f"[CompletePayment] Updated {cursor.rowcount} session(s) directly for user {user.email}")
            except Exception as db_error:
                logger.warning(f"[CompletePayment] Direct session update error: {str(db_error)}")
                
        except Exception as session_error:
            logger.warning(f"[CompletePayment] Session manager update error: {str(session_error)}")
        
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
