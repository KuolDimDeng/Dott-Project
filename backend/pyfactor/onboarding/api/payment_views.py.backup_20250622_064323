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
        
        # Update session to reflect payment pending status
        try:
            from session_manager.models import UserSession
            from django.utils import timezone as dj_timezone
            
            # Update all active sessions for the user
            active_sessions = UserSession.objects.filter(
                user=user,
                is_active=True,
                expires_at__gt=dj_timezone.now()
            )
            
            sessions_updated = 0
            for session in active_sessions:
                # Update session fields to show payment is pending
                session.onboarding_step = 'payment'
                session.subscription_plan = selected_plan
                
                # Store payment pending status in session_data
                if not session.session_data:
                    session.session_data = {}
                session.session_data['payment_pending'] = True
                session.session_data['selected_plan'] = selected_plan
                session.session_data['billing_cycle'] = billing_cycle
                
                # If tenant_id is available, update it
                if tenant_id:
                    session.tenant_id = tenant_id
                    
                session.save(update_fields=['onboarding_step', 'subscription_plan', 'session_data', 'tenant_id', 'updated_at'])
                sessions_updated += 1
                
            logger.info(f"[PaymentPending] Updated {sessions_updated} active session(s) with payment pending status")
            
        except Exception as session_error:
            logger.warning(f"[PaymentPending] Session update error: {str(session_error)}")
            # Don't fail the request just because session update failed
        
        return Response({
            'status': 'success',
            'message': 'Payment marked as pending',
            'data': {
                'user_id': str(user.id),
                'tenant_id': str(tenant_id) if tenant_id else None,
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
            from django.utils import timezone
            
            # Update all active sessions for the user
            active_sessions = UserSession.objects.filter(
                user=user,
                is_active=True,
                expires_at__gt=timezone.now()
            )
            
            sessions_updated = 0
            for session in active_sessions:
                # Update session fields
                session.needs_onboarding = False
                session.onboarding_completed = True
                session.onboarding_step = 'completed'
                session.subscription_plan = onboarding_progress.subscription_plan
                session.subscription_status = 'active'
                
                # If tenant_id is available, update it
                if onboarding_progress.tenant_id:
                    session.tenant_id = onboarding_progress.tenant_id
                    
                session.save(update_fields=[
                    'needs_onboarding', 'onboarding_completed', 'onboarding_step',
                    'subscription_plan', 'subscription_status', 'tenant_id', 'updated_at'
                ])
                sessions_updated += 1
                
            logger.info(f"[CompletePayment] Updated {sessions_updated} active session(s) for user {user.email}")
            
            # Also try to get the current session ID from the request
            session_id = None
            
            # Check if we have session info in the request
            if hasattr(request, 'session') and hasattr(request.session, 'session_id'):
                session_id = str(request.session.session_id)
            elif hasattr(request, 'auth') and hasattr(request.auth, 'session_id'):
                session_id = str(request.auth.session_id)
                
            # If we don't have a session ID, try to get from cookies
            if not session_id:
                session_cookie = request.COOKIES.get('sid')
                if session_cookie:
                    session_id = session_cookie
                    
            if session_id:
                # Update the specific session via service
                updated_session = session_service.update_session(
                    session_id=session_id,
                    needs_onboarding=False,
                    onboarding_completed=True,
                    onboarding_step='completed',
                    subscription_plan=onboarding_progress.subscription_plan,
                    subscription_status='active',
                    tenant_id=str(onboarding_progress.tenant_id) if onboarding_progress.tenant_id else None
                )
                if updated_session:
                    logger.info(f"[CompletePayment] Updated specific session {session_id} for user {user.email}")
                else:
                    logger.warning(f"[CompletePayment] Failed to update specific session {session_id}")
                    
        except Exception as session_error:
            logger.warning(f"[CompletePayment] Session manager update error: {str(session_error)}")
            # Don't fail the payment completion just because session update failed
        
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
