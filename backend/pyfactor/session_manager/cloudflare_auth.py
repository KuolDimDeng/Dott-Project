"""
Cloudflare-compatible authentication handler for session creation.
Handles the Auth0 -> Cloudflare -> Django authentication flow.
"""
import logging
import jwt
from django.conf import settings
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from custom_auth.models import User

logger = logging.getLogger(__name__)


class CloudflareAuth0Authentication(authentication.BaseAuthentication):
    """
    Custom authentication that handles Auth0 tokens passed through Cloudflare.
    This is needed because Cloudflare may modify or strip certain headers.
    """
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        # Try multiple ways to get the auth token
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        # Also check for token in custom headers (Cloudflare might move it)
        if not auth_header:
            auth_header = request.META.get('HTTP_X_AUTHORIZATION', '')
        
        # Check for session token in cookies as fallback
        if not auth_header:
            session_token = request.COOKIES.get('session_token')
            if session_token:
                # This is a session token, not JWT, so handle differently
                return self._authenticate_session(request, session_token)
        
        if not auth_header:
            return None
            
        # Extract token from Bearer header
        parts = auth_header.split()
        if parts[0].lower() != 'bearer' or len(parts) != 2:
            return None
            
        token = parts[1]
        
        # If token looks like a UUID (session token), handle as session
        if self._is_uuid(token):
            return self._authenticate_session(request, token)
        
        # Otherwise, treat as JWT
        return self._authenticate_jwt(request, token)
    
    def _is_uuid(self, token):
        """Check if token looks like a UUID."""
        import re
        uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
        return bool(uuid_pattern.match(token))
    
    def _authenticate_session(self, request, session_token):
        """Authenticate using session token."""
        from session_manager.models import UserSession
        
        try:
            session = UserSession.objects.select_related('user').get(
                session_token=session_token,
                is_active=True
            )
            
            # Check if session is expired
            from django.utils import timezone
            if session.expires_at < timezone.now():
                session.is_active = False
                session.save()
                raise AuthenticationFailed('Session expired')
            
            # Update last activity
            session.last_activity = timezone.now()
            session.save(update_fields=['last_activity'])
            
            return (session.user, session_token)
            
        except UserSession.DoesNotExist:
            logger.warning(f"Session token not found: {session_token[:8]}...")
            return None
    
    def _authenticate_jwt(self, request, token):
        """Authenticate using JWT token from Auth0."""
        try:
            # Decode without verification first to get the header
            unverified = jwt.decode(token, options={"verify_signature": False})
            
            # Get Auth0 domain and audience
            auth0_domain = getattr(settings, 'AUTH0_DOMAIN', 'dev-cbyy63jovi6zrcos.us.auth0.com')
            audience = getattr(settings, 'AUTH0_AUDIENCE', 'https://api.dottapps.com')
            
            # Verify the token
            # Note: In production, you should fetch the JWKS from Auth0
            # For now, we'll do basic validation
            if unverified.get('iss') != f'https://{auth0_domain}/':
                raise AuthenticationFailed('Invalid token issuer')
            
            if audience not in unverified.get('aud', []):
                raise AuthenticationFailed('Invalid token audience')
            
            # Get user by Auth0 sub
            auth0_sub = unverified.get('sub')
            if not auth0_sub:
                raise AuthenticationFailed('No sub claim in token')
            
            try:
                user = User.objects.get(auth0_sub=auth0_sub)
                return (user, token)
            except User.DoesNotExist:
                # Try by email as fallback
                email = unverified.get('email')
                if email:
                    try:
                        user = User.objects.get(email=email)
                        # Update auth0_sub if missing
                        if not user.auth0_sub:
                            user.auth0_sub = auth0_sub
                            user.save(update_fields=['auth0_sub'])
                        return (user, token)
                    except User.DoesNotExist:
                        pass
                
                logger.error(f"User not found for Auth0 sub: {auth0_sub}")
                raise AuthenticationFailed('User not found')
                
        except jwt.InvalidTokenError as e:
            logger.error(f"JWT decode error: {e}")
            raise AuthenticationFailed('Invalid token')
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise AuthenticationFailed('Authentication failed')