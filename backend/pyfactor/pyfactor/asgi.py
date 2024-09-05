import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import chatbot.routing
from pyfactor.logging_config import get_logger

logger = get_logger()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

logger.debug("Configuring ASGI application")
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chatbot.routing.websocket_urlpatterns
        )
    ),
})
logger.debug("ASGI application configured")