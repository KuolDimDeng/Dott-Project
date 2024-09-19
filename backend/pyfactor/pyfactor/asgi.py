import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.conf import settings

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Ensure Django apps are loaded
django.setup()

# Now it's safe to import your app-specific modules
from chatbot.middleware import TokenAuthMiddlewareStack
import chatbot.routing
from pyfactor.logging_config import get_logger

# Get Django ASGI application
django_asgi_app = get_asgi_application()

# Set up logger
logger = get_logger()

# Configure the ASGI application
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        TokenAuthMiddlewareStack(
            URLRouter(
                chatbot.routing.websocket_urlpatterns
            )
        )
    ),
})

logger.debug("ASGI application configured")

# Error handling for development
if settings.DEBUG:
    import traceback
    from channels.middleware import BaseMiddleware

    class DebugMiddleware(BaseMiddleware):
        async def __call__(self, scope, receive, send):
            try:
                return await super().__call__(scope, receive, send)
            except Exception as ex:
                logger.error(f"Error in ASGI application: {ex}")
                logger.error(traceback.format_exc())
                raise

    application = DebugMiddleware(application)
    logger.info("Debug middleware applied to ASGI application")

logger.info("ASGI application ready")

# Daphne-specific configuration
daphne_app = application