import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

from django.core.asgi import get_asgi_application
import django

# Initialize Django first
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator, OriginValidator
from django.conf import settings
from channels.auth import AuthMiddlewareStack
from onboarding.middleware import TokenAuthMiddlewareStack
from pyfactor.logging_config import get_logger
from channels.middleware import BaseMiddleware
import onboarding.routing

# Set up logger
logger = get_logger()

# Get Django ASGI application
django_asgi_app = get_asgi_application()

class CORSMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            # Handle WebSocket CORS
            origin = None
            for key, value in scope.get("headers", []):
                if key == b"origin":
                    origin = value.decode("utf-8")
                    break

            if origin:
                logger.debug(f"WebSocket connection attempt from origin: {origin}")
                if origin in settings.ALLOWED_ORIGINS:
                    logger.info(f"Allowed WebSocket connection from origin: {origin}")
                    return await super().__call__(scope, receive, send)
                else:
                    logger.warning(f"Rejected WebSocket connection from unauthorized origin: {origin}")
                    return None
            
        return await super().__call__(scope, receive, send)

class ErrorLoggingMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        try:
            return await super().__call__(scope, receive, send)
        except Exception as ex:
            logger.error(f"Error in ASGI application: {str(ex)}")
            import traceback
            logger.error(traceback.format_exc())
            raise

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": CORSMiddleware(
        AllowedHostsOriginValidator(
            TokenAuthMiddlewareStack(
                URLRouter(
                    onboarding.routing.websocket_urlpatterns
                )
            )
        )
    ),
})

logger.debug("ASGI application configured")

# Error handling for development
if settings.DEBUG:
    application = ErrorLoggingMiddleware(application)
    logger.info("Debug middleware applied to ASGI application")

    # Add verbose logging for WebSocket connections
    async def log_websocket_message(message):
        logger.debug(f"WebSocket message: {message}")
        return message

    class WebSocketLoggingMiddleware(BaseMiddleware):
        async def __call__(self, scope, receive, send):
            if scope["type"] == "websocket":
                async def logged_receive():
                    message = await receive()
                    return await log_websocket_message(message)
                
                async def logged_send(message):
                    await log_websocket_message(message)
                    await send(message)
                
                return await super().__call__(scope, logged_receive, logged_send)
            return await super().__call__(scope, receive, send)

    application = WebSocketLoggingMiddleware(application)
    logger.info("WebSocket logging middleware applied")

logger.info("ASGI application ready")

# Daphne-specific configuration
daphne_app = application