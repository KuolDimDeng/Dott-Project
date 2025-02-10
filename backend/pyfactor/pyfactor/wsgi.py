"""
WSGI config for pyfactor project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/wsgi/
"""

import os
import django
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Initialize the WSGI application
application = get_wsgi_application()

# Now that Django is set up and apps are loaded, initialize the Cognito client
from custom_auth.client import get_cognito_client
cognito_client = get_cognito_client()
