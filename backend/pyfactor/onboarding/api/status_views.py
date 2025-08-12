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
from custom_auth.rls import set_tenant_context, clear_tenant_context

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
            
            # Set tenant context for RLS
            if hasattr(user, 'tenant') and user.tenant:
                set_tenant_context(user.tenant.id)
            
            # Get OnboardingProgress from database
            progress = OnboardingProgress.objects.filter(user=user).first()
            
            # Default response if no progress record
            if not progress:
                logger.info(f"[OnboardingStatus] No progress record found for {user.email}")
                
                # Check if user already has a business (invited user)
                if hasattr(user, 'business_id') and user.business_id:
                    logger.info(f"[OnboardingStatus] User {user.email} is an invited user with business_id: {user.business_id}")
                    
                    # Create complete onboarding record for invited user
                    progress = OnboardingProgress.objects.create(
                        user=user,
                        tenant_id=user.business_id,
                        onboarding_status='complete',
                        setup_completed=True,
                        payment_completed=True,
                        current_step='complete',
                        completed_steps=['business_info', 'subscription', 'payment', 'complete']
                    )
                    logger.info(f"[OnboardingStatus] Created complete onboarding record for invited user {user.email}")
                    
                    return Response({
                        'needs_onboarding': False,
                        'status': 'complete',
                        'current_step': 'complete',
                        'tenant_id': str(user.business_id),
                        'subscription_plan': 'free',
                        'completed_steps': ['business_info', 'subscription', 'payment', 'complete'],
                        'is_complete': True,
                        'setup_completed': True,
                        'payment_completed': True
                    })
                
                # New user without business needs onboarding
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
            logger.error(f"[OnboardingStatus] Error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to get onboarding status',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            # Always clear tenant context
            clear_tenant_context()


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
            
            # Get subscription plan from request data
            data = request.data or {}
            selected_plan = data.get('selected_plan', 'free')
            billing_cycle = data.get('billing_cycle', 'monthly')
            
            # Get tenant_id - either from user.tenant or create a new one
            if user.tenant:
                tenant_id = user.tenant.id
            else:
                # Create a tenant for the user if they don't have one
                from custom_auth.models import Tenant
                import uuid
                tenant_id = uuid.uuid4()
                # Get business name from request or onboarding progress
                business_name = data.get('business_name')
                if not business_name:
                    # Try to get from existing onboarding progress
                    existing_progress = OnboardingProgress.objects.filter(user=user).first()
                    if existing_progress and existing_progress.business:
                        business_name = existing_progress.business.name
                
                if not business_name:
                    return Response({
                        'error': 'Business name is required to complete onboarding',
                        'detail': 'No business name found in request or onboarding progress'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                tenant = Tenant.objects.create(
                    id=tenant_id,
                    name=business_name,
                    owner_id=str(user.id),
                    is_active=True,
                    rls_enabled=True
                )
                user.tenant = tenant
                user.save(update_fields=['tenant'])
                logger.info(f"[ForceComplete] Created tenant {tenant_id} for user {user.email}")
            
            # Get or create OnboardingProgress
            progress, created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'tenant_id': tenant_id,
                    'onboarding_status': 'complete',
                    'setup_completed': True,
                    'subscription_plan': selected_plan
                }
            )
            
            if not created:
                # Update existing record
                progress.onboarding_status = 'complete'
                progress.current_step = 'complete'
                progress.setup_completed = True
                progress.completed_at = timezone.now()
                progress.subscription_plan = selected_plan
                # Update tenant_id if it was missing
                if not progress.tenant_id:
                    progress.tenant_id = tenant_id
                
                # Update completed steps
                if not progress.completed_steps:
                    progress.completed_steps = []
                
                required_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
                for step in required_steps:
                    if step not in progress.completed_steps:
                        progress.completed_steps.append(step)
                
                progress.save()
                
            logger.info(f"[ForceComplete] Successfully updated onboarding status to complete for {user.email}")
            
            # Also update user.onboarding_completed and subscription_plan on the User model
            user.onboarding_completed = True
            user.onboarding_completed_at = timezone.now()
            user.subscription_plan = selected_plan
            user.save(update_fields=['onboarding_completed', 'onboarding_completed_at', 'subscription_plan'])
                
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
                'status': 'complete',
                'subscription_plan': selected_plan,
                'tenant_id': str(tenant_id)
            })
            
        except Exception as e:
            logger.error(f"[ForceComplete] Error: {str(e)}")
            return Response({
                'error': 'Failed to complete onboarding',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)