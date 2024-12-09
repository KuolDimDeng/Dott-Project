# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/routing.py

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application
from onboarding.middleware import WebSocketAuthMiddleware
from onboarding.routing import websocket_urlpatterns
from channels.middleware import BaseMiddleware
from django.conf import settings
from pyfactor.logging_config import get_logger

logger = get_logger()

class ErrorHandlingMiddleware(BaseMiddleware):
    """Middleware to handle WebSocket errors gracefully"""
    async def __call__(self, scope, receive, send):
        try:
            return await super().__call__(scope, receive, send)
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")
            if scope["type"] == "websocket":
                await send({
                    "type": "websocket.close",
                    "code": 4000,
                    "reason": "Internal server error",
                })
            raise

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