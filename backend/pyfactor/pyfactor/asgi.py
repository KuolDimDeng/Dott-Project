# pyfactor/asgi.py

import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Initialize the ASGI application
application = get_asgi_application()

# Now that Django is set up and apps are loaded, initialize the Cognito client
from custom_auth.client import get_cognito_client
cognito_client = get_cognito_client()
