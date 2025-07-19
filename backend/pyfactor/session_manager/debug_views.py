"""
Debug views for troubleshooting session issues
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import UserSession
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class SessionDebugView(APIView):
    """
    Debug endpoint to check session status
    GET /api/sessions/debug/<session_id>/
    """
    authentication_classes = []  # No auth required for debugging
    permission_classes = []
    
    def get(self, request, session_id):
        """Check if a session exists and its status"""
        logger.info(f"[SessionDebug] Checking session: {session_id}")
        
        debug_info = {
            'session_id': session_id,
            'current_time': timezone.now().isoformat(),
            'session_exists': False,
            'session_details': None,
            'recent_sessions': [],
            'diagnostic_info': {}
        }
        
        try:
            # Check if session exists
            session = UserSession.objects.filter(session_id=session_id).first()
            
            if session:
                debug_info['session_exists'] = True
                debug_info['session_details'] = {
                    'user_email': session.user.email,
                    'user_id': session.user.id,
                    'created_at': session.created_at.isoformat(),
                    'expires_at': session.expires_at.isoformat(),
                    'is_active': session.is_active,
                    'is_expired': session.expires_at <= timezone.now(),
                    'tenant': session.tenant.name if session.tenant else None,
                    'tenant_id': str(session.tenant.id) if session.tenant else None,
                    'user_business_id': getattr(session.user, 'business_id', None),
                    'user_tenant_id': getattr(session.user, 'tenant_id', None),
                    'last_activity': session.last_activity.isoformat() if session.last_activity else None,
                }
                
                # Check why it might not be working
                if not session.is_active:
                    debug_info['diagnostic_info']['issue'] = 'Session is marked as inactive'
                elif session.expires_at <= timezone.now():
                    debug_info['diagnostic_info']['issue'] = 'Session has expired'
                elif not getattr(session.user, 'business_id', None):
                    debug_info['diagnostic_info']['issue'] = 'User has no business_id'
                else:
                    debug_info['diagnostic_info']['issue'] = 'Session appears valid'
            else:
                debug_info['diagnostic_info']['issue'] = 'Session does not exist in database'
            
            # Get recent sessions for context
            recent = UserSession.objects.all().order_by('-created_at')[:5]
            for s in recent:
                debug_info['recent_sessions'].append({
                    'session_id': str(s.session_id),
                    'user_email': s.user.email,
                    'created_at': s.created_at.isoformat(),
                    'is_active': s.is_active and s.expires_at > timezone.now()
                })
            
            return Response(debug_info, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"[SessionDebug] Error: {str(e)}")
            debug_info['error'] = str(e)
            return Response(debug_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)