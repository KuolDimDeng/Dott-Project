# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/routing.py

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application
from onboarding.middleware import WebSocketAuthMiddleware
from onboarding.routing import websocket_urlpatterns
from channels.middleware import BaseMiddleware
from django.conf import settings
from pyfactor.logging_config import get_logger
import logging

logger = get_logger()

class ErrorHandlingMiddleware(BaseMiddleware):
    """
    Middleware to handle WebSocket errors gracefully with enhanced error reporting
    and connection management
    """
    async def __call__(self, scope, receive, send):
        connection_id = id(scope)
        try:
            logger.debug(f"New connection attempt: {connection_id}")
            
            # Check connection limits
            if scope["type"] == "websocket":
                max_connections = getattr(settings, 'WEBSOCKET_CONFIG', {}).get('MAX_CONNECTIONS', 1000)
                if self._get_active_connections() >= max_connections:
                    logger.warning(f"Connection limit reached. Rejecting connection: {connection_id}")
                    await send({
                        "type": "websocket.close",
                        "code": 1013,  # Try again later
                        "reason": "Server at capacity",
                    })
                    return

            # Process the connection
            return await super().__call__(scope, receive, send)

        except Exception as e:
            logger.error(f"WebSocket error for connection {connection_id}: {str(e)}", exc_info=True)
            if scope["type"] == "websocket":
                try:
                    await send({
                        "type": "websocket.close",
                        "code": 4000,
                        "reason": "Internal server error",
                    })
                except Exception as close_error:
                    logger.error(f"Error while closing connection {connection_id}: {str(close_error)}")
            raise

        finally:
            if scope["type"] == "websocket":
                logger.debug(f"Connection finished: {connection_id}")

    def _get_active_connections(self):
        """Helper method to track active connections"""
        # This should be implemented with your preferred connection tracking method
        # For example, using Redis or a shared counter
        return 0  # Placeholder implementation

# Initialize ASGI application with middleware stack
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": ErrorHandlingMiddleware(
        AllowedHostsOriginValidator(
            WebSocketAuthMiddleware(
                URLRouter(websocket_urlpatterns)
            )
        )
    ),
})