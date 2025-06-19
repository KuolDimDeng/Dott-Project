from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging

# Import session manager components
from session_manager.models import UserSession
from session_manager.services import session_service

logger = logging.getLogger(__name__)
User = get_user_model()


class SessionTokenAuthentication(BaseAuthentication):
    """
    Custom authentication class that accepts session tokens from:
    1. Authorization header with 'Session' or 'Bearer' prefix
    2. Cookies (sid or session_token)
    """
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        # Try to get token from Authorization header first
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        token = None
        
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2:
                auth_type, potential_token = parts
                # Accept both 'Session' and 'Bearer' prefixes
                if auth_type.lower() in ['session', 'bearer']:
                    token = potential_token
                    logger.debug(f"Token found in {auth_type} header")
        
        # If no token in header, try cookies
        if not token:
            token = request.COOKIES.get('sid') or request.COOKIES.get('session_token')
            if token:
                logger.debug("Token found in cookies")
        
        if not token:
            logger.debug("No session token found in request")
            return None
        
        try:
            # Use session service to validate the session token
            session = session_service.get_session(token)
            
            if not session:
                logger.warning(f"Session {token[:8]}... not found or expired")
                raise AuthenticationFailed('Invalid or expired session')
            
            # Check if session is still active
            if not session.is_active:
                logger.warning(f"Session {token[:8]}... is inactive")
                raise AuthenticationFailed('Session has been invalidated')
            
            # Check if session is expired
            if session.is_expired():
                logger.warning(f"Session {token[:8]}... has expired")
                raise AuthenticationFailed('Session has expired')
            
            # Get the user
            user = session.user
            if not user.is_active:
                logger.warning(f"User {user.email} is inactive")
                raise AuthenticationFailed('User account is disabled')
            
            # Attach session to request for later use
            request.session_obj = session
            
            logger.info(f"Successfully authenticated user {user.email} with session token")
            return (user, session)
            
        except AuthenticationFailed:
            raise
        except Exception as e:
            logger.error(f"Error during session authentication: {str(e)}")
            raise AuthenticationFailed('Authentication error')
    
    def authenticate_header(self, request):
        """
        Return a string to be used as the value of the `WWW-Authenticate`
        header in a `401 Unauthenticated` response, or `None` if the
        authentication scheme should return `403 Permission Denied` responses.
        """
        return 'Session realm="api"'