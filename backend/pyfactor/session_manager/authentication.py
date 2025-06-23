"""
Session-based Authentication
Custom authentication backend using session tokens
"""

import logging
from typing import Optional, Tuple

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import BaseBackend
from django.http import HttpRequest
from rest_framework import authentication, exceptions

from .services import session_service
from .models import UserSession

# Import RLS functions
from custom_auth.rls import set_tenant_context, clear_tenant_context

logger = logging.getLogger(__name__)
User = get_user_model()


class SessionAuthentication(authentication.BaseAuthentication):
    """
    Session token authentication for DRF
    Expects 'Session <token>' in Authorization header
    """
    
    keyword = 'Session'
    
    def authenticate(self, request: HttpRequest) -> Optional[Tuple[User, UserSession]]:
        """
        Authenticate request using session token
        
        Returns:
            Tuple of (user, session) or None
        """
        auth = authentication.get_authorization_header(request).split()
        
        if not auth or auth[0].lower() != self.keyword.lower().encode():
            # Check for session cookie as fallback
            session_token = request.COOKIES.get('session_token')
            if not session_token:
                return None
        else:
            if len(auth) == 1:
                msg = 'Invalid session header. No token provided.'
                raise exceptions.AuthenticationFailed(msg)
            elif len(auth) > 2:
                msg = 'Invalid session header. Token string should not contain spaces.'
                raise exceptions.AuthenticationFailed(msg)
            
            try:
                session_token = auth[1].decode()
            except UnicodeError:
                msg = 'Invalid session header. Token string should not contain invalid characters.'
                raise exceptions.AuthenticationFailed(msg)
        
        return self.authenticate_credentials(session_token, request)
    
    def authenticate_credentials(self, token: str, request: HttpRequest) -> Tuple[User, UserSession]:
        """
        Authenticate the session token
        
        Args:
            token: Session token
            request: HTTP request
            
        Returns:
            Tuple of (user, session)
        """
        # Get session from service
        session = session_service.get_session(token)
        
        if not session:
            raise exceptions.AuthenticationFailed('Invalid or expired session token.')
        
        if not session.is_active:
            raise exceptions.AuthenticationFailed('Session has been invalidated.')
        
        if session.is_expired():
            raise exceptions.AuthenticationFailed('Session has expired.')
        
        # Get user
        user = session.user
        
        if not user.is_active:
            raise exceptions.AuthenticationFailed('User account is disabled.')
        
        # Update session metadata if available
        if hasattr(request, 'META'):
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Check for suspicious activity
            if session.ip_address and session.ip_address != ip_address:
                logger.warning(
                    f"Session {session.session_id} IP change: "
                    f"{session.ip_address} -> {ip_address}"
                )
        
        # Attach session to request for later use
        request.session_obj = session
        
        # Set RLS tenant context if user has a tenant
        if hasattr(user, 'tenant_id') and user.tenant_id:
            logger.debug(f"[SessionAuth] Setting RLS context for tenant: {user.tenant_id}")
            set_tenant_context(str(user.tenant_id))
            # Store tenant_id on request for middleware/views
            request.tenant_id = user.tenant_id
        else:
            logger.debug(f"[SessionAuth] User {user.email} has no tenant_id")
            clear_tenant_context()
        
        return (user, session)
    
    def _get_client_ip(self, request: HttpRequest) -> Optional[str]:
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def authenticate_header(self, request: HttpRequest) -> str:
        """Return authentication header"""
        return self.keyword


class SessionBackend(BaseBackend):
    """
    Django authentication backend using sessions
    """
    
    def authenticate(self, request, session_token=None, **kwargs):
        """
        Authenticate using session token
        
        Args:
            request: HTTP request
            session_token: Session token
            
        Returns:
            User or None
        """
        if not session_token:
            return None
        
        session = session_service.get_session(session_token)
        
        if not session or not session.is_active or session.is_expired():
            return None
        
        return session.user
    
    def get_user(self, user_id):
        """Get user by ID"""
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None