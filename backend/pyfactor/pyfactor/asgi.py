# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/asgi.py

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

from django.core.asgi import get_asgi_application
import django

# Initialize Django first
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.conf import settings
from channels.auth import AuthMiddlewareStack
from onboarding.middleware import WebSocketAuthMiddleware  # Updated import
from pyfactor.logging_config import get_logger
from channels.middleware import BaseMiddleware
from channels.exceptions import DenyConnection
from onboarding.routing import websocket_urlpatterns  # Import directly from onboarding.routing
import traceback
from typing import Callable, Any

# Set up logger
logger = get_logger()

# Get Django ASGI application
django_asgi_app = get_asgi_application()

class CORSMiddleware(BaseMiddleware):
    """Handle CORS for WebSocket connections"""
    
    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> Any:
        if scope["type"] == "websocket":
            headers = dict(scope.get("headers", []))
            origin = headers.get(b"origin", b"").decode("utf-8")

            if not origin:
                logger.warning("No origin header in WebSocket request")
                await self.deny_connection(send, "No origin header")
                return

            logger.debug(f"WebSocket connection attempt from origin: {origin}")
            
            allowed_origins = getattr(settings, 'ALLOWED_ORIGINS', [
                'http://localhost:3000',
                'http://127.0.0.1:3000'
            ])
            
            if origin not in allowed_origins:
                logger.warning(f"Rejected WebSocket connection from unauthorized origin: {origin}")
                await self.deny_connection(send, "Origin not allowed")
                return
            
            logger.info(f"Allowed WebSocket connection from origin: {origin}")

        return await super().__call__(scope, receive, send)

    async def deny_connection(self, send: Callable, reason: str) -> None:
        """Helper method to deny WebSocket connections"""
        await send({
            "type": "websocket.close",
            "code": 4000,
            "reason": reason,
        })
        raise DenyConnection(reason)

class ErrorLoggingMiddleware(BaseMiddleware):
    """Log errors in the ASGI application"""
    
    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> Any:
        try:
            return await super().__call__(scope, receive, send)
        except DenyConnection:
            # Expected behavior, don't log as error
            raise
        except Exception as e:
            logger.error(
                f"Error in ASGI application: {str(e)}\n"
                f"Scope: {scope}\n"
                f"Traceback: {traceback.format_exc()}"
            )
            if scope["type"] == "websocket":
                await send({
                    "type": "websocket.close",
                    "code": 4500,
                    "reason": "Internal server error",
                })
            raise

class WebSocketLoggingMiddleware(BaseMiddleware):
    """Log WebSocket messages for debugging"""
    
    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> Any:
        if scope["type"] == "websocket":
            async def logged_receive():
                message = await receive()
                logger.debug(f"WebSocket received: {message}")
                return message
            
            async def logged_send(message):
                logger.debug(f"WebSocket sending: {message}")
                await send(message)
                
            return await super().__call__(scope, logged_receive, logged_send)
        return await super().__call__(scope, receive, send)

def get_asgi_application_with_middleware():
    """Create and configure the ASGI application with all middleware"""
    try:
        app = ProtocolTypeRouter({
            "http": django_asgi_app,
            "websocket": CORSMiddleware(
                AllowedHostsOriginValidator(
                    WebSocketAuthMiddleware(
                        URLRouter(websocket_urlpatterns)  # Use imported websocket_urlpatterns
                    )
                )
            ),
        })

        logger.info("ASGI application configured successfully")
        return app
        
    except Exception as e:
        logger.critical(
            f"Failed to configure ASGI application: {str(e)}\n"
            f"Traceback: {traceback.format_exc()}"
        )
        raise

# Create the application
application = get_asgi_application_with_middleware()
logger.info("ASGI application configured and ready")

# Daphne-specific configuration
daphne_app = application