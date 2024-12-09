# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/middleware.py

import jwt
import time
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from asgiref.sync import sync_to_async  # Changed this line
from django.contrib.auth import get_user_model
from django.conf import settings
from urllib.parse import parse_qs
from pyfactor.logging_config import get_logger
from django.db import connection
from jwt.exceptions import (
    InvalidTokenError,
    ExpiredSignatureError,
    InvalidSignatureError,
    DecodeError
)
import asyncio
from functools import wraps
from django.http import JsonResponse

User = get_user_model()
logger = get_logger()

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

# First define the sync function
def get_user_from_token_sync(token_str):
    """Validate token and get associated user with connection management"""
    try:
        connection.ensure_connection()
        
        # Verify and decode the token
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
            logger.error('No user_id in token')
            return AnonymousUser()

        # Get user with select_related and prefetch_related
        user = User.objects.select_related(
            'profile',
            'onboardingprogress'
        ).prefetch_related(
            'groups',
            'user_permissions'
        ).get(id=user_id)

        if not user.is_active:
            logger.warning(f'User {user_id} is not active')
            return AnonymousUser()

        return user

    except Exception as e:
        logger.error(f'Error in get_user_from_token: {str(e)}')
        return AnonymousUser()
    finally:
        connection.close_if_unusable_or_obsolete()

# Then wrap it with the decorators
@sync_to_async
@database_retry(max_retries=3)
def get_user_from_token(token_str):
    return get_user_from_token_sync(token_str)

class HTTPAuthMiddleware:
    """Middleware for HTTP request authentication"""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            # Check if this is a WebSocket request
            if 'websocket' in request.META.get('HTTP_UPGRADE', '').lower():
                return self.get_response(request)

            # Process regular HTTP request
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                user = get_user_from_token_sync(token)
                request.user = user
            
            response = self.get_response(request)
            return response

        except Exception as e:
            logger.error(f"Error in HTTP middleware: {str(e)}")
            return JsonResponse(
                {"error": "Authentication failed"}, 
                status=401
            )

    def process_request(self, request):
        return None

class WebSocketAuthMiddleware(BaseMiddleware):
    """Middleware specifically for WebSocket authentication"""
    CONNECT_TIMEOUT = 10  # seconds
    
    def __init__(self, inner):
        super().__init__(inner)
        self._connection_cache = {}
        self._lock = asyncio.Lock()

    async def __call__(self, scope, receive, send):
        timeout_handler = None
        try:
            # Check if this is a WebSocket connection
            if scope["type"] != "websocket":
                return await self.inner(scope, receive, send)

            # Add timeout to connection
            timeout_handler = asyncio.create_task(
                asyncio.sleep(self.CONNECT_TIMEOUT)
            )

            try:
                # Get token from query params
                query_string = scope.get('query_string', b'').decode()
                query_params = parse_qs(query_string)
                token = query_params.get('token', [None])[0]

                if not token:
                    logger.error('No token provided in WebSocket connection')
                    return await self.close_connection(send)

                # Cache check
                async with self._lock:
                    if token in self._connection_cache:
                        scope.update(self._connection_cache[token])
                        return await self.inner(scope, receive, send)

                # Authenticate user
                user = await get_user_from_token(token)

                if not user.is_authenticated:
                    logger.error('Failed to authenticate WebSocket connection')
                    return await self.close_connection(send)

                # Update scope and cache
                scope_update = {
                    'user': user,
                    'token': token,
                    'auth_timeout': timeout_handler
                }
                
                scope.update(scope_update)
                
                async with self._lock:
                    self._connection_cache[token] = scope_update

                logger.info(f'Authenticated WebSocket connection for user: {user.email}')

                return await self.inner(scope, receive, send)

            except asyncio.TimeoutError:
                logger.error('WebSocket connection timed out')
                return await self.close_connection(send)

        except Exception as e:
            logger.error(f'Error in WebSocket auth middleware: {str(e)}')
            return await self.close_connection(send)
        finally:
            # Cleanup
            if timeout_handler and not timeout_handler.done():
                timeout_handler.cancel()

    async def close_connection(self, send):
        """Enhanced connection closure with cleanup"""
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
    """Convenience wrapper for WebSocket authentication"""
    return WebSocketAuthMiddleware(inner)