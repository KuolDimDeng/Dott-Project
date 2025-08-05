"""
Force Complete Onboarding View

This view ensures onboarding is properly marked as complete in the backend,
solving the issue where users are redirected back to onboarding after clearing cache.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction as db_transaction
import logging

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession

logger = logging.getLogger(__name__)


class ForceCompleteOnboardingView(APIView):
    """
    Force complete onboarding for authenticated users.
    This endpoint ensures the backend properly marks onboarding as complete.
    """
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Force complete the onboarding process"""
        user = request.user
        logger.info(f"[ForceCompleteOnboarding] Processing for user: {user.email}")
        
        try:
            with db_transaction.atomic():
                # Get or create OnboardingProgress
                progress, created = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={
                        'onboarding_status': 'complete',
                        'setup_completed': True,
                        'current_step': 'complete',
                        'next_step': 'dashboard'
                    }
                )
                
                # Log current state
                logger.info(f"[ForceCompleteOnboarding] Current state - status: {progress.onboarding_status}, setup_completed: {progress.setup_completed}")
                
                # Force update to complete status
                progress.onboarding_status = 'complete'
                progress.setup_completed = True
                progress.current_step = 'complete'
                progress.next_step = 'dashboard'
                progress.completed_at = timezone.now()
                progress.setup_timestamp = timezone.now()
                
                # Update completed steps
                completed_steps = progress.completed_steps or []
                required_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
                for step in required_steps:
                    if step not in completed_steps:
                        completed_steps.append(step)
                progress.completed_steps = completed_steps
                
                # Get additional data from request
                data = request.data
                if data.get('selected_plan'):
                    progress.selected_plan = data['selected_plan']
                    progress.subscription_plan = data['selected_plan']
                
                if data.get('payment_verified') or data.get('payment_id'):
                    progress.payment_completed = True
                    if not progress.payment_timestamp:
                        progress.payment_timestamp = timezone.now()
                    if data.get('payment_id'):
                        progress.payment_id = data['payment_id']
                
                if data.get('tenant_id'):
                    progress.tenant_id = data['tenant_id']
                
                # Save the progress
                progress.save()
                
                logger.info(f"[ForceCompleteOnboarding] Updated to - status: {progress.onboarding_status}, setup_completed: {progress.setup_completed}")
                
                # Update user's needs_onboarding flag if it exists
                if hasattr(user, 'needs_onboarding'):
                    user.needs_onboarding = False
                    user.save(update_fields=['needs_onboarding'])
                    logger.info(f"[ForceCompleteOnboarding] Updated user.needs_onboarding to False")
                
                # Update all active sessions
                active_sessions = UserSession.objects.filter(user=user, is_active=True)
                sessions_updated = active_sessions.update(
                    needs_onboarding=False,
                    onboarding_completed=True,
                    onboarding_step='completed',
                    updated_at=timezone.now()
                )
                logger.info(f"[ForceCompleteOnboarding] Updated {sessions_updated} active sessions")
                
                # Return success response
                return Response({
                    'success': True,
                    'message': 'Onboarding marked as complete',
                    'data': {
                        'onboarding_status': progress.onboarding_status,
                        'setup_completed': progress.setup_completed,
                        'needs_onboarding': False,
                        'tenant_id': str(progress.tenant_id) if progress.tenant_id else None,
                        'sessions_updated': sessions_updated
                    }
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"[ForceCompleteOnboarding] Error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'Failed to complete onboarding',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """Check current onboarding status"""
        user = request.user
        
        try:
            progress = OnboardingProgress.objects.filter(user=user).first()
            
            if progress:
                return Response({
                    'success': True,
                    'data': {
                        'onboarding_status': progress.onboarding_status,
                        'setup_completed': progress.setup_completed,
                        'current_step': progress.current_step,
                        'completed_steps': progress.completed_steps,
                        'needs_onboarding': progress.onboarding_status != 'complete' or not progress.setup_completed,
                        'tenant_id': str(progress.tenant_id) if progress.tenant_id else None
                    }
                })
            else:
                return Response({
                    'success': True,
                    'data': {
                        'onboarding_status': 'not_started',
                        'setup_completed': False,
                        'needs_onboarding': True
                    }
                })
                
        except Exception as e:
            logger.error(f"[ForceCompleteOnboarding] GET Error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)