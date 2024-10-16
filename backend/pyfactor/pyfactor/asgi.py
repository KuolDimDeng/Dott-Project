#/Users/kuoldeng/projectx/backend/pyfactor/pyfactor/asgi.py
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

from django.core.asgi import get_asgi_application
import django


# Get Django ASGI application
django_asgi_app = get_asgi_application()


from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.conf import settings
from channels.auth import AuthMiddlewareStack
from onboarding.middleware import TokenAuthMiddlewareStack
from pyfactor.logging_config import get_logger

import onboarding.routing


# Ensure Django apps are loaded
django.setup()

# Now it's safe to import your app-specific modules
from pyfactor.logging_config import get_logger



# Set up logger
logger = get_logger()

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": TokenAuthMiddlewareStack(
        URLRouter(
            onboarding.routing.websocket_urlpatterns
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