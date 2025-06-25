"""
Session-based profile view for authenticated users
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from session_manager.authentication import SessionAuthentication
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress

logger = logging.getLogger(__name__)


class SessionUserProfileView(APIView):
    """
    Get current user profile with tenant information for session authenticated users.
    This endpoint accepts Session tokens instead of Bearer tokens.
    Endpoint: GET /api/users/me/session
    """
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            user = request.user
            logger.info(f"🔥 [SESSION_USER_PROFILE] === STARTING USER PROFILE LOOKUP ===")
            logger.info(f"🔥 [SESSION_USER_PROFILE] Authenticated User: {user.email} (ID: {user.pk})")
            
            # Get user's tenant
            tenant = None
            # Get actual role from user model
            user_role = user.role if hasattr(user, 'role') else 'USER'
            logger.info(f"🔥 [SESSION_USER_PROFILE] User Role: {user_role}")
            
            try:
                # First check if user has a direct tenant relationship
                if hasattr(user, 'tenant') and user.tenant:
                    tenant = user.tenant
                    logger.info(f"🔥 [SESSION_USER_PROFILE] Found tenant via user.tenant relationship: {tenant.id}")
                else:
                    # Fallback: Check if user is owner of a tenant
                    # Convert user.id to string for proper CharField comparison
                    user_id_str = str(user.id)
                    tenant = Tenant.objects.filter(owner_id=user_id_str).first()
                    logger.info(f"🔥 [SESSION_USER_PROFILE] Tenant lookup by owner_id ('{user_id_str}') result: {tenant.id if tenant else 'None'}")
                    
                    # If we found a tenant by owner_id, update the user's tenant field
                    if tenant and not user.tenant:
                        logger.info(f"🔥 [SESSION_USER_PROFILE] Updating user.tenant relationship for consistency")
                        user.tenant = tenant
                        user.save(update_fields=['tenant'])
                
                # Note: We no longer override role based on tenant ownership
                # The user's actual role from the database is used
                    
            except Exception as e:
                logger.warning(f"🔥 [SESSION_USER_PROFILE] Error getting tenant: {str(e)}")
            
            # Get onboarding progress
            onboarding_progress = None
            try:
                onboarding_progress = OnboardingProgress.objects.filter(user=user).first()
                logger.info(f"🔥 [SESSION_USER_PROFILE] Onboarding progress lookup: {onboarding_progress.id if onboarding_progress else 'None'}")
                
                if onboarding_progress:
                    logger.info(f"🔥 [SESSION_USER_PROFILE] Progress details:")
                    logger.info(f"  - status: {onboarding_progress.onboarding_status}")
                    logger.info(f"  - current_step: {onboarding_progress.current_step}")
                    logger.info(f"  - setup_completed: {onboarding_progress.setup_completed}")
                    logger.info(f"  - tenant_id: {onboarding_progress.tenant_id}")
                    logger.info(f"  - completed_steps: {onboarding_progress.completed_steps}")
                    
            except Exception as e:
                logger.warning(f"🔥 [SESSION_USER_PROFILE] Error getting onboarding progress: {str(e)}")

            # SIMPLIFIED: Single source of truth for onboarding status
            needs_onboarding = not user.onboarding_completed
            onboarding_completed = user.onboarding_completed
            
            logger.info(f"🔥 [SESSION_USER_PROFILE] Onboarding status from user model:")
            logger.info(f"  - onboarding_completed: {user.onboarding_completed}")
            logger.info(f"  - needs_onboarding: {needs_onboarding}")
            
            # Get current step from OnboardingProgress if it exists (for UI display only)
            current_step = 'business_info'
            if onboarding_progress:
                current_step = onboarding_progress.current_step or 'business_info'
                # If user completed onboarding, ensure step reflects that
                if onboarding_completed:
                    current_step = 'complete'
            
            logger.info(f"🔥 [SESSION_USER_PROFILE] Final status: needs_onboarding={needs_onboarding}, completed={onboarding_completed}, step={current_step}")
            
            # Get user's subscription plan
            user_subscription = 'free'
            if onboarding_progress and onboarding_progress.subscription_plan:
                user_subscription = onboarding_progress.subscription_plan
                logger.info(f"🔥 [SESSION_USER_PROFILE] User subscription plan: {user_subscription}")
            
            # Check for active Stripe subscription
            try:
                from users.models import Subscription
                active_sub = Subscription.objects.filter(
                    user=user,
                    is_active=True
                ).first()
                if active_sub:
                    user_subscription = active_sub.selected_plan
                    logger.info(f"🔥 [SESSION_USER_PROFILE] Active Stripe subscription: {user_subscription}")
            except Exception as e:
                logger.warning(f"🔥 [SESSION_USER_PROFILE] Error checking Stripe: {e}")
            
            # Get from UserSession if available
            if hasattr(request, 'session_obj') and request.session_obj:
                session = request.session_obj
                if session.subscription_plan:
                    user_subscription = session.subscription_plan
                    logger.info(f"🔥 [SESSION_USER_PROFILE] Subscription from session: {user_subscription}")
            
            response_data = {
                'id': user.pk,
                'email': user.email,
                'name': user.name if hasattr(user, 'name') else user.email.split('@')[0],
                'auth0_sub': user.auth0_sub if hasattr(user, 'auth0_sub') else None,
                'email_verified': user.email_verified if hasattr(user, 'email_verified') else True,
                'tenant_id': str(tenant.id) if tenant else None,
                'tenant_name': tenant.name if tenant else None,
                'role': user_role,
                'needs_onboarding': needs_onboarding,
                'onboarding_completed': onboarding_completed,
                'current_onboarding_step': current_step,
                'subscription_plan': user_subscription,
                'created_at': user.date_joined.isoformat() if hasattr(user, 'date_joined') else None,
                'updated_at': user.modified_at.isoformat() if hasattr(user, 'modified_at') else None
            }
            
            logger.info(f"🔥 [SESSION_USER_PROFILE] Final response data: {response_data}")
            logger.info(f"🔥 [SESSION_USER_PROFILE] === USER PROFILE LOOKUP COMPLETE ===")
            
            return Response(response_data, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"🔥 [SESSION_USER_PROFILE] Unexpected error: {str(e)}")
            import traceback
            logger.error(f"🔥 [SESSION_USER_PROFILE] Traceback:\n{traceback.format_exc()}")
            return Response(
                {'error': 'Failed to get user profile', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )