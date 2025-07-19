"""
Public Session Views
Endpoints for accessing session data without authentication
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .models import UserSession
from .services import session_service

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class PublicSessionDetailView(APIView):
    """
    Get session details without requiring authentication
    GET /api/sessions/public/<uuid:session_id>/
    
    This endpoint provides limited session information for public access.
    It only returns necessary information and includes security checks.
    """
    permission_classes = [AllowAny]  # No authentication required
    
    def get(self, request, session_id):
        """Get session details by ID"""
        try:
            logger.info(f"[PublicSessionDetail] ===== PUBLIC SESSION DETAIL START =====")
            logger.info(f"[PublicSessionDetail] Fetching session: {session_id}")
            logger.info(f"[PublicSessionDetail] Request IP: {self._get_client_ip(request)}")
            
            # Log request headers for debugging
            logger.info(f"[PublicSessionDetail] Request headers:")
            logger.info(f"  - User-Agent: {request.META.get('HTTP_USER_AGENT', 'NOT PRESENT')}")
            logger.info(f"  - CF-Ray: {request.META.get('HTTP_CF_RAY', 'NOT PRESENT')}")
            logger.info(f"  - CF-Connecting-IP: {request.META.get('HTTP_CF_CONNECTING_IP', 'NOT PRESENT')}")
            
            # Get session from service (this handles active and expiry checks)
            session = session_service.get_session(str(session_id))
            
            if not session:
                logger.warning(f"[PublicSessionDetail] Session not found or inactive: {session_id}")
                return Response(
                    {'error': 'Session not found or expired'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if session is still valid
            if not session.is_active or session.is_expired():
                logger.warning(f"[PublicSessionDetail] Session expired or inactive: {session_id}")
                logger.warning(f"[PublicSessionDetail] is_active: {session.is_active}, expires_at: {session.expires_at}")
                return Response(
                    {'error': 'Session expired'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Prepare limited response data for public access
            user = session.user
            tenant = session.tenant
            
            # Get user's basic information
            user_data = {
                'id': user.id,
                'email': user.email,
                'name': getattr(user, 'name', ''),
                'first_name': user.first_name,
                'last_name': user.last_name,
                'subscription_plan': getattr(user, 'subscription_plan', 'free'),
            }
            
            # Get tenant information
            tenant_data = None
            if tenant:
                tenant_data = {
                    'id': str(tenant.id),
                    'name': tenant.name,
                }
                
                # Try to get business name from OnboardingProgress
                try:
                    from onboarding.models import OnboardingProgress
                    onboarding = OnboardingProgress.objects.filter(user=user).first()
                    if onboarding and onboarding.business and onboarding.business.name:
                        tenant_data['business_name'] = onboarding.business.name
                        logger.info(f"[PublicSessionDetail] Found business name: {onboarding.business.name}")
                except Exception as e:
                    logger.debug(f"[PublicSessionDetail] Could not fetch business name: {e}")
            
            # Prepare response
            response_data = {
                'session_id': str(session.session_id),
                'user': user_data,
                'tenant': tenant_data,
                'needs_onboarding': session.needs_onboarding,
                'onboarding_completed': session.onboarding_completed,
                'onboarding_step': session.onboarding_step,
                'subscription_plan': session.subscription_plan,
                'subscription_status': session.subscription_status,
                'is_active': session.is_active,
                'created_at': session.created_at.isoformat(),
                'expires_at': session.expires_at.isoformat(),
                'last_activity': session.last_activity.isoformat(),
            }
            
            # Check onboarding status from backend (single source of truth)
            try:
                onboarding_completed = user.onboarding_completed
                if onboarding_completed != session.onboarding_completed:
                    logger.info(
                        f"[PublicSessionDetail] Onboarding status mismatch - "
                        f"User: {onboarding_completed}, Session: {session.onboarding_completed}"
                    )
                    response_data['onboarding_completed'] = onboarding_completed
                    response_data['needs_onboarding'] = not onboarding_completed
            except AttributeError:
                logger.debug(f"[PublicSessionDetail] User has no onboarding_completed attribute")
            
            logger.info(f"[PublicSessionDetail] Successfully retrieved session for user: {user.email}")
            logger.info(f"[PublicSessionDetail] Session expires at: {session.expires_at}")
            logger.info(f"[PublicSessionDetail] ===== PUBLIC SESSION DETAIL END =====")
            
            return Response(response_data)
            
        except UserSession.DoesNotExist:
            logger.error(f"[PublicSessionDetail] Session {session_id} does not exist")
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"[PublicSessionDetail] Error retrieving session: {str(e)}")
            logger.error(f"[PublicSessionDetail] Error type: {type(e).__name__}")
            import traceback
            logger.error(f"[PublicSessionDetail] Traceback: {traceback.format_exc()}")
            return Response(
                {'error': 'Failed to retrieve session details'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_client_ip(self, request):
        """Get client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip