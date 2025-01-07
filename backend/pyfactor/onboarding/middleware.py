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