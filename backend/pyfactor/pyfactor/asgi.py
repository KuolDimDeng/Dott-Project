# pyfactor/asgi.py

import os
import django
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('asgi')

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Set up Django - prevent access to models during this phase
os.environ.setdefault('DJANGO_ALLOW_ASYNC_UNSAFE', 'true')

try:
    # First, get the ASGI application reference
    from django.core.asgi import get_asgi_application
    django_asgi_app = get_asgi_application()
    
    # Only initialize additional components if not in a management command
    import sys
    if not any(cmd in ' '.join(sys.argv) for cmd in ['migrate', 'makemigrations', 'shell']):
        # After application is defined, set up Django
        django.setup()
        
        try:
            # Try to import channels for WebSocket support
            from channels.routing import ProtocolTypeRouter, URLRouter
            from channels.auth import AuthMiddlewareStack
            from channels.security.websocket import AllowedHostsOriginValidator
            
            # Import WebSocket routing
            from chat.routing import websocket_urlpatterns
            
            # Configure the ASGI application with WebSocket support
            application = ProtocolTypeRouter({
                "http": django_asgi_app,
                "websocket": AllowedHostsOriginValidator(
                    AuthMiddlewareStack(
                        URLRouter(
                            websocket_urlpatterns
                        )
                    )
                ),
            })
            
            logger.info("Django ASGI application with WebSocket support initialized successfully")
        except ImportError as e:
            # If channels not available, use basic ASGI app
            logger.warning(f"Channels not available, using basic ASGI: {e}")
            application = django_asgi_app
    else:
        # For management commands, use basic ASGI app
        application = django_asgi_app
except Exception as e:
    logger.error(f"Error initializing Django ASGI application: {e}", exc_info=True)
    # Fallback to basic ASGI app
    from django.core.asgi import get_asgi_application
    application = get_asgi_application()
