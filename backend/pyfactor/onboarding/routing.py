# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/routing.py

from django.urls import re_path
from django.core.exceptions import ValidationError
from channels.middleware import BaseMiddleware
from . import consumers
from pyfactor.logging_config import get_logger
import uuid
import asyncio
from typing import Callable, Any, Dict, List
from dataclasses import dataclass

logger = get_logger()

@dataclass
class WebSocketPattern:
    """Class to manage WebSocket URL patterns"""
    pattern: str
    name: str
    description: str

WEBSOCKET_PATTERNS = [
    WebSocketPattern(
        pattern=r'^ws/onboarding/(?P<user_id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/$',
        name='onboarding_websocket_uuid',
        description='UUID format user IDs'
    ),
    WebSocketPattern(
        pattern=r'^ws/onboarding/(?P<user_id>\d+)/$',
        name='onboarding_websocket_int',
        description='Integer format user IDs'
    ),
    WebSocketPattern(
        pattern=r'^ws/onboarding/(?P<user_id>[^/]+)/$',
        name='onboarding_websocket_invalid',
        description='Catch-all pattern for invalid formats'
    )
]

def validate_uuid(value: str) -> bool:
    """
    Validate UUID format
    
    Args:
        value: String to validate as UUID
        
    Returns:
        bool: True if valid UUID, False otherwise
    """
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError, TypeError):
        return False

def create_websocket_patterns() -> List[re_path]:
    """
    Create WebSocket URL patterns with logging
    
    Returns:
        List of compiled re_path objects
    """
    patterns = []
    
    for ws_pattern in WEBSOCKET_PATTERNS:
        pattern = re_path(
            ws_pattern.pattern,
            consumers.OnboardingConsumer.as_asgi(),
            name=ws_pattern.name
        )
        patterns.append(pattern)
        logger.debug(
            f"Registered WebSocket pattern: {ws_pattern.pattern} ({ws_pattern.description})"
        )
        
    return patterns

# Create patterns with proper logging
websocket_urlpatterns = create_websocket_patterns()

class WebSocketMiddleware(BaseMiddleware):
    """
    Enhanced WebSocket middleware with comprehensive error handling and monitoring
    """
    
    def __init__(self, inner):
        super().__init__(inner)
        self.timeout = getattr(settings, 'WEBSOCKET_TIMEOUT', 30)
        self.max_message_size = getattr(settings, 'WEBSOCKET_MAX_MESSAGE_SIZE', 1024 * 1024)
        
    async def __call__(
        self,
        scope: Dict[str, Any],
        receive: Callable,
        send: Callable
    ) -> Any:
        """
        Handle WebSocket connections with error handling and timeouts
        
        Args:
            scope: ASGI connection scope
            receive: ASGI receive callable
            send: ASGI send callable
            
        Returns:
            Any: Result of inner application
        """
        if scope["type"] != "websocket":
            return await self.inner(scope, receive, send)

        try:
            # Add connection tracking
            connection_id = str(uuid.uuid4())
            scope['connection_id'] = connection_id
            logger.info(f"New WebSocket connection: {connection_id}")
            
            # Validate user_id if present
            user_id = scope.get('url_route', {}).get('kwargs', {}).get('user_id')
            if user_id and not validate_uuid(user_id):
                raise ValidationError(f"Invalid user ID format: {user_id}")

            # Handle connection with timeout
            async with asyncio.timeout(self.timeout):
                return await self.inner(scope, receive, send)

        except asyncio.TimeoutError:
            logger.error(f"WebSocket timeout for connection {connection_id}")
            await self.close_connection(
                send,
                4408,
                "Connection timed out"
            )
            
        except ValidationError as e:
            logger.warning(f"Validation error: {str(e)}")
            await self.close_connection(
                send,
                4400,
                str(e)
            )
            
        except Exception as e:
            logger.error(
                f"WebSocket error in connection {connection_id}: {str(e)}",
                exc_info=True,
                extra={'scope': scope}
            )
            await self.close_connection(
                send,
                4000,
                "Internal server error"
            )
        
        finally:
            logger.info(f"Closing WebSocket connection: {connection_id}")

    async def close_connection(
        self,
        send: Callable,
        code: int,
        reason: str
    ) -> None:
        """
        Close WebSocket connection with error handling
        
        Args:
            send: ASGI send callable
            code: Close code
            reason: Close reason
        """
        try:
            await send({
                'type': 'websocket.close',
                'code': code,
                'reason': reason
            })
        except Exception as e:
            logger.error(f"Error closing WebSocket: {str(e)}")

def websocket_middleware_factory(inner: Callable) -> WebSocketMiddleware:
    """
    Create middleware instance with type hints
    
    Args:
        inner: Inner application
        
    Returns:
        WebSocketMiddleware instance
    """
    return WebSocketMiddleware(inner)