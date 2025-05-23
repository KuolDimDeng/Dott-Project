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
    application = get_asgi_application()
    
    # Only initialize additional components if not in a management command
    import sys
    if not any(cmd in ' '.join(sys.argv) for cmd in ['migrate', 'makemigrations', 'shell']):
        # After application is defined, set up Django
        django.setup()
        
        logger.info("Django ASGI application initialized successfully")
except Exception as e:
    logger.error(f"Error initializing Django ASGI application: {e}", exc_info=True)
    # Re-raise to ensure proper error handling
    raise
