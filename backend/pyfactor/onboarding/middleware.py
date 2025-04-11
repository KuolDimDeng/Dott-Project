# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/middleware.py

import jwt
import time
import asyncio
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.conf import settings
from urllib.parse import parse_qs
from django.db import connection
from pyfactor.logging_config import get_logger
from functools import wraps
import logging
from django.utils.deprecation import MiddlewareMixin
from .services.redis_session import onboarding_session_service
from .models import OnboardingProgress
from django.utils import timezone
from custom_auth.tenant_context import get_current_tenant, set_current_tenant

User = get_user_model()
logger = logging.getLogger(__name__)

def database_retry(max_retries=3, delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        connection.close()
                        time.sleep(delay * (2 ** attempt))
                    connection.close()
            logger.error(f"All retries failed: {str(last_error)}")
            raise last_error
        return wrapper
    return decorator

def get_user_from_token_sync(token_str):
    """Validate token and get associated user with connection management"""
    try:
        connection.ensure_connection()
        decoded = jwt.decode(
            token_str,
            settings.SECRET_KEY,
            algorithms=["HS256"],
            options={
                'verify_signature': True,
                'verify_exp': True,
                'require': ['exp', 'user_id']
            }
        )
        
        user_id = decoded.get('user_id')
        if not user_id:
            return AnonymousUser()

        user = User.objects.select_related(
            'profile',
            'auth_token'
        ).prefetch_related(
            'groups',
            'user_permissions'
        ).get(id=user_id)

        return user if user.is_active else AnonymousUser()

    except Exception as e:
        logger.error(f'Error in get_user_from_token: {str(e)}')
        return AnonymousUser()
    finally:
        connection.close_if_unusable_or_obsolete()

@sync_to_async
@database_retry(max_retries=3)
def get_user_from_token(token_str):
    return get_user_from_token_sync(token_str)

class WebSocketAuthMiddleware(BaseMiddleware):
    """Middleware for WebSocket authentication"""
    CONNECT_TIMEOUT = 10
    
    def __init__(self, inner):
        super().__init__(inner)
        self._connection_cache = {}
        self._lock = asyncio.Lock()

    async def __call__(self, scope, receive, send):
        timeout_handler = None
        try:
            if scope["type"] != "websocket":
                return await self.inner(scope, receive, send)

            timeout_handler = asyncio.create_task(
                asyncio.sleep(self.CONNECT_TIMEOUT)
            )

            query_string = scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)
            token = query_params.get('token', [None])[0]

            if not token:
                return await self.close_connection(send)

            async with self._lock:
                if token in self._connection_cache:
                    scope.update(self._connection_cache[token])
                    return await self.inner(scope, receive, send)

            user = await get_user_from_token(token)
            if not user.is_authenticated:
                return await self.close_connection(send)

            scope_update = {
                'user': user,
                'token': token,
                'auth_timeout': timeout_handler
            }
            scope.update(scope_update)
            
            async with self._lock:
                self._connection_cache[token] = scope_update

            return await self.inner(scope, receive, send)

        except Exception as e:
            logger.error(f'Error in WebSocket auth middleware: {str(e)}')
            return await self.close_connection(send)
        finally:
            if timeout_handler and not timeout_handler.done():
                timeout_handler.cancel()

    async def close_connection(self, send):
        try:
            if hasattr(self, 'scope') and self.scope.get('token') in self._connection_cache:
                async with self._lock:
                    del self._connection_cache[self.scope['token']]
            
            await send({
                'type': 'websocket.close',
                'code': 4003,
                'reason': 'Unauthorized'
            })
        except Exception as e:
            logger.error(f"Error closing connection: {str(e)}")
        return None

def WebSocketAuthMiddlewareStack(inner):
    return WebSocketAuthMiddleware(inner)

def get_schema_name_from_tenant_id(tenant_id):
    """
    Generate a schema name from a tenant ID for backward compatibility.
    
    Args:
        tenant_id: The tenant UUID
        
    Returns:
        A schema name in the format 'tenant_uuid' with hyphens replaced by underscores
    """
    if not tenant_id:
        return None
    
    # Convert tenant_id to string and replace hyphens with underscores
    tenant_id_str = str(tenant_id).replace('-', '_')
    return f"tenant_{tenant_id_str}"

class SchemaNameMiddleware:
    """
    Middleware to handle the removal of schema_name column by providing
    a consistent way to get the schema name from a tenant ID.
    
    This adds a method to the Tenant model instance dynamically to provide
    backward compatibility with code that expects  tenant.id.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Add schema_name property to Tenant model
        from custom_auth.models import Tenant
        
        # Only add if it doesn't already exist
        if not hasattr(Tenant, 'schema_name'):
            # Add a property that generates the schema name from the ID
            # Use our locally defined function to generate the schema name
            def schema_name_getter(tenant_instance):
                return get_schema_name_from_tenant_id(tenant_instance.id)
                
            Tenant.schema_name = property(schema_name_getter)
            logger.info("Added schema_name property to Tenant model")
            
        # Call the next middleware
        response = self.get_response(request)
        return response


class AsyncSchemaTenantMiddleware:
    """
    Middleware to handle setting tenant context in async views.
    Uses sync_to_async to work in async context.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    async def __call__(self, scope, receive, send):
        # Process the request
        response = await self.get_response(scope, receive, send)
        return response
    
    @sync_to_async
    def set_tenant_context(self, tenant_id):
        """Set the tenant context in the database session."""
        if tenant_id:
            set_current_tenant(tenant_id)
            logger.debug(f"Set tenant context to {tenant_id}")
            
    @sync_to_async
    def clear_tenant_context(self):
        """Clear the tenant context from the database session."""
        set_current_tenant(None)
        logger.debug("Cleared tenant context")

class OnboardingSessionMiddleware(MiddlewareMixin):
    """
    Middleware for managing onboarding sessions using Redis
    
    This middleware ensures that onboarding data is properly stored and synced
    between the Redis cache and the database, providing a seamless experience
    for users during the onboarding process.
    """
    
    def __init__(self, get_response=None):
        self.get_response = get_response
        self.onboarding_paths = ['/api/onboarding', '/onboarding']
        
    def process_request(self, request):
        """Process incoming request to set up onboarding session"""
        # Only process for onboarding-related paths
        if not any(request.path.startswith(path) for path in self.onboarding_paths):
            return None
            
        # Skip for unauthenticated users
        if not request.user.is_authenticated:
            return None
            
        # Get or create session ID from request cookies
        session_id = request.COOKIES.get('onboardingSessionId')
        if not session_id:
            # Create new session ID
            session_id = onboarding_session_service.create_session(str(request.user.id))
            # Session ID will be set in cookie in the response
            request.onboarding_session_id = session_id
        
        # Store session ID in request for access in views
        request.onboarding_session_id = session_id
        
        # Try to sync onboarding progress with database
        try:
            # Get or create onboarding progress
            progress, created = OnboardingProgress.objects.get_or_create(
                user=request.user,
                defaults={
                    'tenant_id': request.user.id,
                    'session_id': session_id,
                    'last_session_activity': timezone.now()
                }
            )
            
            if not created:
                # Update session activity
                progress.record_session_activity(session_id)
                
            # Store progress in request for access in views
            request.onboarding_progress = progress
            
        except Exception as e:
            logger.error(f"Error syncing onboarding progress: {str(e)}")
            
        return None
        
    def process_response(self, request, response):
        """Process response to set session cookie and sync data to database"""
        # Only process for onboarding-related paths
        if not any(request.path.startswith(path) for path in self.onboarding_paths):
            return response
            
        # Skip for unauthenticated users
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response
            
        # Set session cookie if new session created
        if hasattr(request, 'onboarding_session_id'):
            max_age = 24 * 60 * 60  # 24 hours
            response.set_cookie(
                'onboardingSessionId',
                request.onboarding_session_id,
                max_age=max_age,
                httponly=True,
                samesite='Lax',
                secure=not settings.DEBUG
            )
            
        # Sync data to database before request ends for non-GET requests
        if request.method != 'GET' and hasattr(request, 'onboarding_session_id'):
            session_id = request.onboarding_session_id
            try:
                onboarding_session_service.sync_to_db(session_id, OnboardingProgress)
            except Exception as e:
                logger.error(f"Error syncing session data to database: {str(e)}")
                
        return response