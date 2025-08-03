from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging

# Import session manager components
from session_manager.models import UserSession
from session_manager.services import session_service

# Import RLS functions
from custom_auth.rls import set_tenant_context, clear_tenant_context

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
        logger.info("[SessionTokenAuth] Starting authentication")
        logger.info(f"[SessionTokenAuth] Request path: {request.path}")
        logger.info(f"[SessionTokenAuth] Request method: {request.method}")
        
        # Try to get token from Authorization header first
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        logger.info(f"[SessionTokenAuth] Authorization header: {auth_header}")
        token = None
        
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2:
                auth_type, potential_token = parts
                logger.info(f"[SessionTokenAuth] Auth type: {auth_type}, Token preview: {potential_token[:8] if potential_token else 'None'}...")
                # Accept both 'Session' and 'Bearer' prefixes
                if auth_type.lower() in ['session', 'bearer']:
                    # For Session tokens, check if it's a UUID (not JWT)
                    if auth_type.lower() == 'session' and '.' not in potential_token:
                        token = potential_token
                        logger.info(f"[SessionTokenAuth] Session token (UUID) found in {auth_type} header")
                    elif auth_type.lower() == 'bearer' and '.' not in potential_token:
                        # Also accept Bearer with UUID tokens (for compatibility)
                        token = potential_token
                        logger.info(f"[SessionTokenAuth] Session token (UUID) found in Bearer header")
                    elif auth_type.lower() == 'bearer' and '.' in potential_token:
                        # This is a JWT token, skip it (let Auth0 handle it)
                        logger.info(f"[SessionTokenAuth] JWT token detected in Bearer header, skipping")
                        return None
        
        # If no token in header, try cookies
        if not token:
            cookie_sid = request.COOKIES.get('sid')
            cookie_session = request.COOKIES.get('session_token')
            logger.info(f"[SessionTokenAuth] Cookie sid: {cookie_sid[:8] if cookie_sid else 'None'}...")
            logger.info(f"[SessionTokenAuth] Cookie session_token: {cookie_session[:8] if cookie_session else 'None'}...")
            token = cookie_sid or cookie_session
            if token:
                logger.info(f"[SessionTokenAuth] Token found in cookies: {token[:8]}...")
        
        if not token:
            logger.info("[SessionTokenAuth] No session token found in request")
            return None
        
        try:
            logger.info(f"[SessionTokenAuth] Validating session token: {token[:8]}...")
            
            # Use session service to validate the session token
            session = session_service.get_session(token)
            
            if not session:
                logger.warning(f"[SessionTokenAuth] Session {token[:8]}... not found or expired")
                raise AuthenticationFailed('Invalid or expired session')
            
            logger.debug(f"[SessionTokenAuth] Session found: {session.session_id}")
            
            # Check if session is still active
            if not session.is_active:
                logger.warning(f"[SessionTokenAuth] Session {token[:8]}... is inactive")
                raise AuthenticationFailed('Session has been invalidated')
            
            # Check if session is expired
            if session.is_expired():
                logger.warning(f"[SessionTokenAuth] Session {token[:8]}... has expired")
                raise AuthenticationFailed('Session has expired')
            
            # Get the user
            user = session.user
            logger.debug(f"[SessionTokenAuth] User found: {user.email} (ID: {user.pk})")
            
            if not user.is_active:
                logger.warning(f"[SessionTokenAuth] User {user.email} is inactive")
                raise AuthenticationFailed('User account is disabled')
            
            # Attach session to request for later use
            request.session_obj = session
            
            # Set RLS tenant context if user has a tenant
            tenant_id = None
            if hasattr(user, 'tenant') and user.tenant:
                tenant_id = user.tenant.id
                logger.debug(f"[SessionTokenAuth] Found tenant via relationship: {tenant_id}")
            elif hasattr(user, 'tenant_id') and user.tenant_id:
                tenant_id = user.tenant_id
                logger.debug(f"[SessionTokenAuth] Found tenant_id attribute: {tenant_id}")
            elif hasattr(user, 'business_id') and user.business_id:
                tenant_id = user.business_id
                logger.debug(f"[SessionTokenAuth] Using business_id as tenant: {tenant_id}")
            
            if tenant_id:
                logger.debug(f"[SessionTokenAuth] Setting RLS context for tenant: {tenant_id}")
                set_tenant_context(str(tenant_id))
                # Store tenant_id on request for middleware/views
                request.tenant_id = tenant_id
                # Also set tenant_id on user for backward compatibility
                if not hasattr(user, 'tenant_id'):
                    user.tenant_id = tenant_id
            else:
                logger.debug(f"[SessionTokenAuth] User {user.email} has no tenant_id")
                clear_tenant_context()
            
            logger.info(f"[SessionTokenAuth] ✅ Successfully authenticated user {user.email} with session token")
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