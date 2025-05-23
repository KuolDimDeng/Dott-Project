"""
WSGI config for pyfactor project - Docker deployment.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os
import sys
from django.core.wsgi import get_wsgi_application

# Add the project directory to Python path
sys.path.insert(0, '/app')
sys.path.insert(0, '/app/pyfactor')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')

application = get_wsgi_application()
