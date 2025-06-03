"""
Auth0 Middleware for Django
Validates JWT tokens and attaches user info to requests
"""
import json
from functools import wraps
from django.http import JsonResponse
from django.conf import settings
from jose import jwt
from urllib.request import urlopen
import logging

logger = logging.getLogger(__name__)

class Auth0Error(Exception):
    """Auth0 validation error"""
    def __init__(self, error, status_code):
        self.error = error
        self.status_code = status_code

def get_token_auth_header(request):
    """Extract JWT token from Authorization header"""
    auth = request.META.get("HTTP_AUTHORIZATION", None)
    if not auth:
        raise Auth0Error({"code": "authorization_header_missing",
                        "description": "Authorization header is expected"}, 401)

    parts = auth.split()

    if parts[0].lower() != "bearer":
        raise Auth0Error({"code": "invalid_header",
                        "description": "Authorization header must start with Bearer"}, 401)
    elif len(parts) == 1:
        raise Auth0Error({"code": "invalid_header",
                        "description": "Token not found"}, 401)
    elif len(parts) > 2:
        raise Auth0Error({"code": "invalid_header",
                        "description": "Authorization header must be Bearer token"}, 401)

    token = parts[1]
    return token

class Auth0Middleware:
    """Middleware to validate Auth0 JWT tokens"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Cache the JWKS
        self._jwks = None
        self._jwks_uri = f'https://{settings.AUTH0_DOMAIN}/.well-known/jwks.json'
        
    def __call__(self, request):
        # Skip auth for public endpoints
        public_paths = [
            '/api/health/',
            '/api/auth/callback',
            '/api/auth/login',
            '/api/auth/logout',
            '/admin/',
        ]
        
        if any(request.path.startswith(path) for path in public_paths):
            return self.get_response(request)
        
        # Skip for non-API paths
        if not request.path.startswith('/api/'):
            return self.get_response(request)
        
        try:
            # Get token from header
            token = get_token_auth_header(request)
            
            # Get JWKS (cached)
            if not self._jwks:
                jsonurl = urlopen(self._jwks_uri)
                self._jwks = json.loads(jsonurl.read())
            
            # Decode and validate token
            unverified_header = jwt.get_unverified_header(token)
            rsa_key = {}
            
            for key in self._jwks["keys"]:
                if key["kid"] == unverified_header["kid"]:
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"]
                    }
                    break
            
            if not rsa_key:
                raise Auth0Error({"code": "invalid_header",
                                "description": "Unable to find appropriate key"}, 401)
            
            # Validate the token
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                audience=settings.AUTH0_AUDIENCE,
                issuer=f"https://{settings.AUTH0_DOMAIN}/"
            )
            
            # Attach user info to request
            request.auth0_user = payload
            request.auth0_token = token
            
        except Auth0Error as e:
            return JsonResponse(e.error, status=e.status_code)
        except Exception as e:
            logger.error(f"Auth0 middleware error: {str(e)}")
            return JsonResponse({"error": "Authentication failed"}, status=401)
        
        response = self.get_response(request)
        return response

def requires_auth(f):
    """Decorator to require Auth0 authentication"""
    @wraps(f)
    def decorator(request, *args, **kwargs):
        if not hasattr(request, 'auth0_user'):
            return JsonResponse({"error": "Authentication required"}, status=401)
        return f(request, *args, **kwargs)
    return decorator

def requires_scope(required_scope):
    """Decorator to require specific Auth0 scope"""
    def require_scope(f):
        @wraps(f)
        def decorated(request, *args, **kwargs):
            if not hasattr(request, 'auth0_user'):
                return JsonResponse({"error": "Authentication required"}, status=401)
                
            token_scopes = request.auth0_user.get("scope", "").split()
            if required_scope not in token_scopes:
                return JsonResponse({"error": "Insufficient scope"}, status=403)
                
            return f(request, *args, **kwargs)
        return decorated
    return require_scope