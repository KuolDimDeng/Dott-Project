"""
Fixed Session Token Authentication with better error handling
"""
import logging
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from session_manager.models import UserSession

logger = logging.getLogger(__name__)
User = get_user_model()

class SessionTokenAuthenticationFixed(BaseAuthentication):
    """
    Fixed authentication that handles session tokens with proper error handling
    """
    
    def authenticate(self, request):
        try:
            # Get the session ID from cookie or Authorization header
            session_id = None
            
            # Check cookie first
            session_id = request.COOKIES.get('sid') or request.COOKIES.get('session_token')
            
            # Check Authorization header if no cookie
            if not session_id:
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                if auth_header.startswith('Bearer '):
                    session_id = auth_header[7:]
                elif auth_header.startswith('Session '):
                    session_id = auth_header[8:]
            
            if not session_id:
                logger.debug("[SessionAuth Fixed] No session ID found")
                return None
            
            # Try to get session with error handling
            try:
                session = UserSession.objects.get(session_id=session_id, is_active=True)
                
                # Check if session is expired
                if session.is_expired():
                    logger.debug(f"[SessionAuth Fixed] Session {session_id} is expired")
                    return None
                
                # Get user
                user = session.user
                if not user.is_active:
                    logger.debug(f"[SessionAuth Fixed] User {user.email} is not active")
                    return None
                
                # Set attributes on user for compatibility
                if hasattr(session, 'tenant_id'):
                    user.tenant_id = session.tenant_id
                    user.business_id = session.tenant_id
                
                logger.info(f"[SessionAuth Fixed] Authenticated user: {user.email}")
                return (user, session)
                
            except UserSession.DoesNotExist:
                logger.debug(f"[SessionAuth Fixed] Session {session_id} not found")
                return None
            except Exception as e:
                logger.error(f"[SessionAuth Fixed] Error getting session: {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"[SessionAuth Fixed] Authentication error: {str(e)}")
            return None
    
    def authenticate_header(self, request):
        return 'Bearer'