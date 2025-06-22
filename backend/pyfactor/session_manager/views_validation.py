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
            
            # Get session from service
            session = session_service.get_session(str(session_id))
            
            if not session:
                logger.warning(f"[SessionValidate] Session not found: {session_id}")
                return Response(
                    {'error': 'Session not found or expired'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if session is still valid (active and not expired)
            if not session.is_active or session.is_expired():
                logger.warning(f"[SessionValidate] Session expired or inactive: {session_id}")
                return Response(
                    {'error': 'Session expired'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Serialize session data
            serializer = SessionSerializer(session)
            
            logger.info(f"[SessionValidate] Session valid for user: {session.user.email}")
            
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"[SessionValidate] Error validating session: {str(e)}")
            return Response(
                {'error': 'Failed to validate session'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )