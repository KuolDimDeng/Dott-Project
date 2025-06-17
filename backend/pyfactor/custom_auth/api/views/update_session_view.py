"""
Update Session View
Handles updating session data for Auth0 users
"""

import logging
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)
User = get_user_model()


class UpdateSessionView(APIView):
    """
    Update user session data to reflect current onboarding status.
    Endpoint: POST /api/auth/update-session/
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            data = request.data
            
            logger.info(f"[UPDATE_SESSION] Request from user: {user.email}")
            logger.info(f"[UPDATE_SESSION] Data: {data}")
            
            needs_onboarding = data.get('needs_onboarding')
            onboarding_completed = data.get('onboarding_completed')
            tenant_id = data.get('tenant_id')
            subscription_plan = data.get('subscription_plan')
            
            # Update all active sessions for the user
            active_sessions = UserSession.objects.filter(
                user=user,
                is_active=True,
                expires_at__gt=timezone.now()
            )
            
            sessions_updated = 0
            for session in active_sessions:
                updated_fields = []
                
                if needs_onboarding is not None:
                    session.needs_onboarding = needs_onboarding
                    updated_fields.append('needs_onboarding')
                    
                if onboarding_completed is not None:
                    session.onboarding_completed = onboarding_completed
                    session.onboarding_step = 'complete' if onboarding_completed else session.onboarding_step
                    updated_fields.extend(['onboarding_completed', 'onboarding_step'])
                    
                if tenant_id:
                    tenant = Tenant.objects.filter(id=tenant_id).first()
                    if tenant:
                        session.tenant = tenant
                        updated_fields.append('tenant')
                        
                if subscription_plan:
                    session.subscription_plan = subscription_plan
                    updated_fields.append('subscription_plan')
                
                if updated_fields:
                    session.save(update_fields=updated_fields)
                    sessions_updated += 1
            
            logger.info(f"[UPDATE_SESSION] Updated {sessions_updated} session(s) for {user.email}")
            
            # Also ensure OnboardingProgress is updated
            if onboarding_completed:
                try:
                    progress = OnboardingProgress.objects.get(user=user)
                    if progress.onboarding_status != 'complete':
                        progress.onboarding_status = 'complete'
                        progress.current_step = 'complete'
                        progress.setup_completed = True
                        progress.completed_at = timezone.now()
                        progress.save()
                        logger.info(f"[UPDATE_SESSION] Also updated OnboardingProgress to complete")
                except OnboardingProgress.DoesNotExist:
                    logger.warning(f"[UPDATE_SESSION] No OnboardingProgress found for user")
            
            return Response({
                'success': True,
                'message': f'Updated {sessions_updated} session(s)',
                'data': {
                    'user_id': user.id,
                    'sessions_updated': sessions_updated,
                    'needs_onboarding': needs_onboarding,
                    'onboarding_completed': onboarding_completed,
                    'tenant_id': tenant_id,
                    'subscription_plan': subscription_plan
                }
            })
            
        except Exception as e:
            logger.error(f"[UPDATE_SESSION] Error: {str(e)}")
            return Response({
                'error': 'Failed to update session',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)