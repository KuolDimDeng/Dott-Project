"""
Debug endpoint for checking user session state
Created by Version0008_fix_paid_user_auth_issues.py
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from session_manager.models import UserSession
from onboarding.models import OnboardingProgress
from users.models import Subscription

logger = logging.getLogger(__name__)

class DebugSessionStateView(APIView):
    """
    Debug endpoint to check complete user session state
    GET /api/debug/session-state/
    """
    authentication_classes = [Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get complete session state for debugging"""
        try:
            user = request.user
            
            # Get all user sessions
            sessions = UserSession.objects.filter(user=user).order_by('-created_at')
            
            # Get onboarding progress
            onboarding = None
            try:
                onboarding = OnboardingProgress.objects.get(user=user)
            except OnboardingProgress.DoesNotExist:
                pass
            
            # Get active subscriptions
            subscriptions = Subscription.objects.filter(user=user).order_by('-created_at')
            
            response_data = {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'auth0_sub': getattr(user, 'auth0_sub', None),
                    'tenant_id': str(user.tenant.id) if hasattr(user, 'tenant') and user.tenant else None,
                },
                'sessions': [
                    {
                        'session_id': str(s.session_id),
                        'is_active': s.is_active,
                        'needs_onboarding': s.needs_onboarding,
                        'onboarding_completed': s.onboarding_completed,
                        'subscription_plan': s.subscription_plan,
                        'created_at': s.created_at.isoformat(),
                        'expires_at': s.expires_at.isoformat(),
                    }
                    for s in sessions[:5]  # Last 5 sessions
                ],
                'onboarding': {
                    'exists': onboarding is not None,
                    'status': onboarding.onboarding_status if onboarding else None,
                    'setup_completed': onboarding.setup_completed if onboarding else None,
                    'subscription_plan': onboarding.subscription_plan if onboarding else None,
                    'completed_steps': onboarding.completed_steps if onboarding else [],
                } if onboarding else None,
                'subscriptions': [
                    {
                        'stripe_id': s.stripe_subscription_id,
                        'status': s.status,
                        'plan_name': s.plan_name,
                        'created_at': s.created_at.isoformat(),
                    }
                    for s in subscriptions[:3]  # Last 3 subscriptions
                ],
                'request_info': {
                    'has_auth_token': bool(request.auth),
                    'headers': {
                        'authorization': 'present' if request.META.get('HTTP_AUTHORIZATION') else 'missing',
                        'x-tenant-id': request.META.get('HTTP_X_TENANT_ID'),
                    }
                }
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Debug endpoint error: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
