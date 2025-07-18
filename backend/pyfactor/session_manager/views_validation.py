"""
Session Validation Views
Endpoints for validating sessions without requiring authentication
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .services import session_service
from .serializers import SessionSerializer

logger = logging.getLogger(__name__)


class SessionValidateView(APIView):
    """
    Validate a session by its UUID without requiring authentication
    GET /api/sessions/validate/<uuid:session_id>/
    
    This endpoint is used during authentication flow to validate session tokens
    """
    permission_classes = [AllowAny]  # No authentication required
    
    def get(self, request, session_id):
        """Validate session by ID"""
        try:
            logger.info(f"[SessionValidate] Validating session: {session_id}")
            logger.info(f"[SessionValidate] Request headers: {dict(request.headers)}")
            
            # Try to get session directly from database first
            from .models import UserSession
            from django.utils import timezone
            
            # Check if session exists at all
            session_exists = UserSession.objects.filter(session_id=session_id).exists()
            logger.info(f"[SessionValidate] Session exists in database: {session_exists}")
            
            if session_exists:
                # Get the session without filters first to see its state
                raw_session = UserSession.objects.get(session_id=session_id)
                logger.info(f"[SessionValidate] Raw session data:")
                logger.info(f"  - is_active: {raw_session.is_active}")
                logger.info(f"  - expires_at: {raw_session.expires_at}")
                logger.info(f"  - current_time: {timezone.now()}")
                logger.info(f"  - is_expired: {raw_session.expires_at < timezone.now()}")
                logger.info(f"  - user_email: {raw_session.user.email}")
                logger.info(f"  - created_at: {raw_session.created_at}")
                logger.info(f"  - last_activity: {raw_session.last_activity}")
            
            # Get session from service
            session = session_service.get_session(str(session_id))
            
            if not session:
                logger.warning(f"[SessionValidate] Session not found by service: {session_id}")
                logger.warning(f"[SessionValidate] This could mean the session is inactive or expired")
                return Response(
                    {'error': 'Session not found or expired'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if session is still valid (active and not expired)
            if not session.is_active or session.is_expired():
                logger.warning(f"[SessionValidate] Session expired or inactive: {session_id}")
                logger.warning(f"[SessionValidate] is_active: {session.is_active}, is_expired: {session.is_expired()}")
                return Response(
                    {'error': 'Session expired'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Serialize session data
            serializer = SessionSerializer(session)
            
            logger.info(f"[SessionValidate] Session valid for user: {session.user.email}")
            logger.info(f"[SessionValidate] Returning session data")
            
            return Response(serializer.data)
            
        except UserSession.DoesNotExist:
            logger.error(f"[SessionValidate] Session {session_id} does not exist in database")
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"[SessionValidate] Error validating session: {str(e)}")
            logger.error(f"[SessionValidate] Error type: {type(e).__name__}")
            import traceback
            logger.error(f"[SessionValidate] Traceback: {traceback.format_exc()}")
            return Response(
                {'error': 'Failed to validate session'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )