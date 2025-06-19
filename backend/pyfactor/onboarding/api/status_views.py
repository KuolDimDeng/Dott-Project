"""
Onboarding Status API Views
Single source of truth for onboarding status
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from onboarding.models import OnboardingProgress
from django.utils import timezone

logger = logging.getLogger(__name__)


class OnboardingStatusView(APIView):
    """
    Get current onboarding status from database
    This is the SINGLE SOURCE OF TRUTH for onboarding status
    """
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get onboarding status for authenticated user"""
        try:
            user = request.user
            logger.info(f"[OnboardingStatus] Checking status for user: {user.email}")
            
            # Get OnboardingProgress from database
            progress = OnboardingProgress.objects.filter(user=user).first()
            
            # Default response if no progress record
            if not progress:
                logger.info(f"[OnboardingStatus] No progress record found for {user.email}")
                return Response({
                    'needs_onboarding': True,
                    'status': 'not_started',
                    'current_step': 'business_info',
                    'tenant_id': None,
                    'subscription_plan': 'free',
                    'completed_steps': [],
                    'is_complete': False
                })
            
            # Determine if onboarding is complete
            is_complete = (
                progress.onboarding_status == 'complete' or
                progress.setup_completed or
                (progress.completed_steps and 'complete' in progress.completed_steps)
            )
            
            needs_onboarding = not is_complete
            
            logger.info(f"[OnboardingStatus] User {user.email}: status={progress.onboarding_status}, complete={is_complete}, needs_onboarding={needs_onboarding}")
            
            return Response({
                'needs_onboarding': needs_onboarding,
                'status': progress.onboarding_status,
                'current_step': progress.current_step or progress.onboarding_status,
                'tenant_id': str(progress.tenant_id) if progress.tenant_id else None,
                'subscription_plan': progress.subscription_plan or 'free',
                'completed_steps': progress.completed_steps or [],
                'is_complete': is_complete,
                'setup_completed': progress.setup_completed,
                'payment_completed': progress.payment_completed
            })
            
        except Exception as e:
            logger.error(f"[OnboardingStatus] Error: {str(e)}")
            return Response({
                'error': 'Failed to get onboarding status',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ForceCompleteOnboardingView(APIView):
    """
    Force complete onboarding for a user
    This ensures the database is updated correctly
    """
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Force complete onboarding for authenticated user"""
        try:
            user = request.user
            logger.info(f"[ForceComplete] Force completing onboarding for user: {user.email}")
            
            # Get or create OnboardingProgress
            progress, created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'tenant_id': user.tenant.id if user.tenant else None,
                    'onboarding_status': 'complete',
                    'setup_completed': True
                }
            )
            
            if not created:
                # Update existing record
                progress.onboarding_status = 'complete'
                progress.current_step = 'complete'
                progress.setup_completed = True
                progress.completed_at = timezone.now()
                
                # Update completed steps
                if not progress.completed_steps:
                    progress.completed_steps = []
                
                required_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
                for step in required_steps:
                    if step not in progress.completed_steps:
                        progress.completed_steps.append(step)
                
                progress.save()
                
            logger.info(f"[ForceComplete] Successfully updated onboarding status to complete for {user.email}")
            
            # Also update user.needs_onboarding if it exists
            if hasattr(user, 'needs_onboarding'):
                user.needs_onboarding = False
                user.save(update_fields=['needs_onboarding'])
                
            # Update all active sessions
            from session_manager.models import UserSession
            active_sessions = UserSession.objects.filter(
                user=user,
                is_active=True,
                expires_at__gt=timezone.now()
            )
            
            for session in active_sessions:
                session.needs_onboarding = False
                session.onboarding_completed = True
                session.onboarding_step = 'completed'
                session.save()
                
            return Response({
                'success': True,
                'message': 'Onboarding marked as complete',
                'needs_onboarding': False,
                'status': 'complete'
            })
            
        except Exception as e:
            logger.error(f"[ForceComplete] Error: {str(e)}")
            return Response({
                'error': 'Failed to complete onboarding',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)