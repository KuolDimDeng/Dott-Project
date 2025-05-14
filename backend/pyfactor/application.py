import os
import sys

# Add the project directory to the sys.path
path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if path not in sys.path:
    sys.path.append(path)

# Set the Django settings module to use EB-specific settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')

# Import the Django WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application() 