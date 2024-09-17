import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from chatbot.middleware import TokenAuthMiddlewareStack
import chatbot.routing
from pyfactor.logging_config import get_logger

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Get Django ASGI application
django_asgi_app = get_asgi_application()

# Set up logger
logger = get_logger()

# Configure the ASGI application
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": TokenAuthMiddlewareStack(
        URLRouter(
            chatbot.routing.websocket_urlpatterns
        )
    ),
})

logger.debug("ASGI application configured")