# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/routing.py

from django.urls import re_path
from . import consumers
from pyfactor.logging_config import get_logger
from django.core.exceptions import ValidationError
import uuid
import asyncio
from typing import Callable, Any

logger = get_logger()

def validate_uuid(value: str) -> bool:
    """Validate UUID format"""
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError, TypeError):
        return False

# Single pattern with comprehensive regex and validation
websocket_urlpatterns = [
    re_path(
        # Match UUIDs with strict format
        r'^ws/onboarding/(?P<user_id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/$',
        consumers.OnboardingConsumer.as_asgi(),
        name='onboarding_websocket_uuid'
    ),
    re_path(
        # Match integer IDs
        r'^ws/onboarding/(?P<user_id>\d+)/$',
        consumers.OnboardingConsumer.as_asgi(),
        name='onboarding_websocket_int'
    ),
]

# Add catch-all for invalid formats with better error handling
websocket_urlpatterns.append(
    re_path(
        r'^ws/onboarding/(?P<user_id>[^/]+)/$',
        consumers.OnboardingConsumer.as_asgi(),
        name='onboarding_websocket_invalid'
    )
)

# Log registered patterns with better formatting
logger.debug(
    "Registered WebSocket URL patterns: %s",
    '\n'.join(f"- {pattern.pattern}" for pattern in websocket_urlpatterns)
)

class WebSocketMiddleware:
    """Enhanced WebSocket middleware with better error handling and timeouts"""
    
    def __init__(self, inner):
        self.inner = inner
        self.timeout = 30  # seconds

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> Any:
        if scope["type"] != "websocket":
            return await self.inner(scope, receive, send)

        try:
            async with asyncio.timeout(self.timeout):
                return await self.inner(scope, receive, send)
                
        except asyncio.TimeoutError:
            logger.error("WebSocket operation timed out")
            await self.close_connection(send, 4408, "Operation timed out")
            
        except Exception as e:
            logger.error(
                f"WebSocket error: {str(e)}",
                exc_info=True,
                extra={'scope': scope}
            )
            await self.close_connection(send, 4000, str(e))

    async def close_connection(
        self,
        send: Callable,
        code: int,
        reason: str
    ) -> None:
        """Helper method for closing connections"""
        try:
            await send({
                'type': 'websocket.close',
                'code': code,
                'reason': reason
            })
        except Exception as e:
            logger.error(f"Error closing WebSocket: {str(e)}")

def websocket_middleware(inner: Callable) -> Callable:
    """Middleware factory with better typing"""
    return WebSocketMiddleware(inner)