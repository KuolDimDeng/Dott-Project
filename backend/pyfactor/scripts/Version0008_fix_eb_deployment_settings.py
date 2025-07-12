#!/usr/bin/env python3
"""
Version0008_fix_eb_deployment_settings.py
Script to enhance the Elastic Beanstalk deployment settings and application configuration
to improve error handling, logging, and runtime stability.

Author: DevOps Team
Version: 1.0.0
Date: May 15, 2025
"""

import os
import re
import sys
import shutil
import datetime

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLICATION_FILE = os.path.join(PROJECT_ROOT, "application.py")
SETTINGS_EB_FILE = os.path.join(PROJECT_ROOT, "pyfactor", "settings_eb.py")

def create_backup(file_path):
    """Create a timestamped backup of a file."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup-{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Backup created: {backup_path}")
    return backup_path

def enhance_application_file():
    """Enhance the application.py file with better error handling and logging."""
    if not os.path.exists(APPLICATION_FILE):
        print(f"Error: {APPLICATION_FILE} not found.")
        return False

    # Create a backup
    create_backup(APPLICATION_FILE)

    # Read the application file
    with open(APPLICATION_FILE, 'r') as f:
        content = f.read()

    # Enhanced application.py with improved error handling and explicit imports
    updated_content = """import os
import sys
import traceback
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('eb_application')
logger.setLevel(logging.DEBUG)  # Set to DEBUG for more verbose logging during deployment

# Add the project directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
path = os.path.dirname(current_dir)
if path not in sys.path:
    sys.path.insert(0, path)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Debug Python path
logger.info("Python path: %s", sys.path)
logger.info("Current directory: %s", current_dir)

# Make sure logs directory exists
logs_dir = os.path.join(current_dir, 'logs')
if not os.path.exists(logs_dir):
    try:
        os.makedirs(logs_dir)
        logger.info("Created logs directory at %s", logs_dir)
    except Exception as e:
        logger.warning("Failed to create logs directory: %s", str(e))

# Set the Django settings module - default to settings_eb.py for Elastic Beanstalk
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')
logger.info("Using Django settings module: %s", os.environ.get('DJANGO_SETTINGS_MODULE'))

# Determine if we're running in the Elastic Beanstalk environment
IN_ELASTIC_BEANSTALK = 'EB_ENV_NAME' in os.environ
if IN_ELASTIC_BEANSTALK:
    logger.info("Running in Elastic Beanstalk environment: %s", os.environ.get('EB_ENV_NAME'))
else:
    logger.info("Not running in Elastic Beanstalk environment")

# Print environment variables for debugging (excluding sensitive info)
safe_vars = {k: v for k, v in os.environ.items() 
             if not any(secret in k.lower() for secret in ['password', 'secret', 'key', 'token'])}
logger.debug("Environment variables: %s", safe_vars)

# Preload dependencies to catch any import errors early
try:
    import django
    logger.info("Django version: %s", django.get_version())
    
    import psycopg2
    logger.info("psycopg2 installed")
    
    # Try to import other critical packages
    import redis
    logger.info("Redis installed")
    
except ImportError as e:
    logger.error("Failed to import required package: %s", str(e))
    logger.error(traceback.format_exc())

# Health check WSGI application
def application(environ, start_response):
    path = environ.get('PATH_INFO', '')

    # Handle health check endpoint
    if path == '/health/':
        logger.info("Health check request received")
        status = '200 OK'
        headers = [('Content-type', 'text/plain')]
        start_response(status, headers)
        return [b'Healthy']

    # For all other paths, try using Django
    try:
        logger.info(f"Processing request: {path}")
        from django.core.wsgi import get_wsgi_application
        
        # Initialize Django application
        try:
            django_app = get_wsgi_application()
            logger.info("Django WSGI application initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Django WSGI application: {str(e)}")
            logger.error(traceback.format_exc())
            raise
            
        return django_app(environ, start_response)
    except Exception as e:
        # Log the full traceback for debugging
        logger.error(f"Error in Django application: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Check for common errors and provide more specific error messages
        error_message = str(e).lower()
        if "database" in error_message or "db" in error_message or "sql" in error_message:
            logger.error("Database connection error detected. Check RDS settings and connectivity.")
        elif "redis" in error_message or "broker" in error_message:
            logger.error("Redis connection error detected. Check REDIS_HOST and REDIS_PORT settings.")
        elif "import" in error_message or "module" in error_message:
            logger.error("Python import error detected. Check installed dependencies.")
        elif "permission" in error_message or "access" in error_message:
            logger.error("Permission error detected. Check file and directory permissions.")

        # Fallback response for any errors
        status = '500 Internal Server Error'
        headers = [('Content-type', 'text/plain')]

        # Only show detailed error in non-production environments
        if not IN_ELASTIC_BEANSTALK or os.environ.get('DEBUG', 'False').lower() == 'true':
            error_message = f"Application Error: {str(e)}\\n\\n{traceback.format_exc()}"
            start_response(status, headers)
            return [error_message.encode('utf-8')]
        else:
            # In production, show a generic error message
            start_response(status, headers)
            return [b'Application Error. Please check the logs for details.']

if __name__ == '__main__':
    # For local testing
    from wsgiref.simple_server import make_server

    httpd = make_server('', 8000, application)
    print("Serving on port 8000...")
    httpd.serve_forever()
"""

    # Write updated content back to file
    with open(APPLICATION_FILE, 'w') as f:
        f.write(updated_content)

    print(f"Enhanced {APPLICATION_FILE} with improved error handling and logging")
    return True

def enhance_settings_eb_file():
    """Enhance the settings_eb.py file with more robust configuration."""
    if not os.path.exists(SETTINGS_EB_FILE):
        print(f"Error: {SETTINGS_EB_FILE} not found.")
        return False

    # Create a backup
    create_backup(SETTINGS_EB_FILE)

    # Read the settings file
    with open(SETTINGS_EB_FILE, 'r') as f:
        content = f.read()

    # Enhanced settings_eb.py with more robust configuration
    updated_content = """\"\"\"
Django settings for Elastic Beanstalk deployment.
Enhanced by Version0008_fix_eb_deployment_settings.py script.
\"\"\"

import os
import sys
import logging
from pathlib import Path

# Setup basic logging for settings module
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s %(asctime)s %(module)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('eb_settings')
logger.info("Loading Elastic Beanstalk settings")

# Define base settings in case they're not defined
try:
    from pyfactor.settings import *  # Import all settings from the base settings file
    logger.info("Successfully imported base settings from pyfactor.settings")
except ImportError as e:
    # Define fallbacks for critical settings if main settings import fails
    logger.error(f"Failed to import main settings file: {str(e)}")
    logger.error("Using fallback settings")
    import django

# Ensure BASE_DIR is defined
if 'BASE_DIR' not in locals() and 'BASE_DIR' not in globals():
    BASE_DIR = Path(__file__).resolve().parent.parent
    logger.info(f"Using fallback BASE_DIR: {BASE_DIR}")

# Ensure critical Django settings are defined with fallbacks
if 'INSTALLED_APPS' not in locals() and 'INSTALLED_APPS' not in globals():
    logger.warning("INSTALLED_APPS not found in base settings, using fallback")
    INSTALLED_APPS = [
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'rest_framework',
        'corsheaders',
    ]

if 'MIDDLEWARE' not in locals() and 'MIDDLEWARE' not in globals():
    logger.warning("MIDDLEWARE not found in base settings, using fallback")
    MIDDLEWARE = [
        'django.middleware.security.SecurityMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'corsheaders.middleware.CorsMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
    ]

if 'TEMPLATES' not in locals() and 'TEMPLATES' not in globals():
    logger.warning("TEMPLATES not found in base settings, using fallback")
    TEMPLATES = [
        {
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': [],
            'APP_DIRS': True,
            'OPTIONS': {
                'context_processors': [
                    'django.template.context_processors.debug',
                    'django.template.context_processors.request',
                    'django.contrib.auth.context_processors.auth',
                    'django.contrib.messages.context_processors.messages',
                ],
            },
        },
    ]

if 'SECRET_KEY' not in locals() and 'SECRET_KEY' not in globals():
    logger.warning("SECRET_KEY not found in base settings, using environment variable")
    SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-fallback-key-for-eb-deployment')

# Ensure logs directory exists
LOGS_DIR = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(LOGS_DIR):
    try:
        os.makedirs(LOGS_DIR)
        logger.info(f"Created logs directory at {LOGS_DIR}")
    except Exception as e:
        logger.warning(f"Failed to create logs directory: {str(e)}")
        LOGS_DIR = '/tmp'  # Fallback to /tmp if logs directory can't be created

# Redis settings with fallbacks
REDIS_HOST = os.environ.get('ELASTICACHE_HOST') or os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = os.environ.get('ELASTICACHE_PORT') or os.environ.get('REDIS_PORT', '6379')
logger.info(f"Using Redis host: {REDIS_HOST}, port: {REDIS_PORT}")

# Set to True for local development, False for Elastic Beanstalk deployment
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
logger.info(f"DEBUG mode: {DEBUG}")

# Get the Elastic Beanstalk environment name or use default
EB_ENV_NAME = os.environ.get('EB_ENV_NAME', 'eb-env')
logger.info(f"EB_ENV_NAME: {EB_ENV_NAME}")

# Get the EB domain and add it to ALLOWED_HOSTS
eb_domain = os.environ.get('EB_DOMAIN', f'{EB_ENV_NAME}.elasticbeanstalk.com')
ALLOWED_HOSTS = ['localhost', '127.0.0.1', eb_domain, '.elasticbeanstalk.com', 'dottapps.com', '*.dottapps.com']
logger.info(f"ALLOWED_HOSTS: {ALLOWED_HOSTS}")

# Add specific CORS origins for the EB domain and dottapps.com
allowed_eb_origin = f'https://{eb_domain}'
dottapps_origin = 'https://dottapps.com'

# Make sure CORS_ALLOWED_ORIGINS exists
if not hasattr(globals(), 'CORS_ALLOWED_ORIGINS'):
    CORS_ALLOWED_ORIGINS = []

# Make sure CSRF_TRUSTED_ORIGINS exists
if not hasattr(globals(), 'CSRF_TRUSTED_ORIGINS'):
    CSRF_TRUSTED_ORIGINS = []

# Add EB domain to CORS and CSRF origins
if allowed_eb_origin not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(allowed_eb_origin)

if allowed_eb_origin not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append(allowed_eb_origin)

# Add dottapps.com to CORS and CSRF origins
if dottapps_origin not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(dottapps_origin)

if dottapps_origin not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append(dottapps_origin)

# Database configuration - use RDS settings if available
if 'RDS_HOSTNAME' in os.environ:
    logger.info("Using RDS database settings from environment variables")
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ['RDS_DB_NAME'],
            'USER': os.environ['RDS_USERNAME'],
            'PASSWORD': os.environ['RDS_PASSWORD'],
            'HOST': os.environ['RDS_HOSTNAME'],
            'PORT': os.environ['RDS_PORT'],
            'OPTIONS': {
                'connect_timeout': 10,
                'sslmode': 'prefer',  # 'require' can cause issues in some EB environments
                'keepalives': 1,
                'keepalives_idle': 30,
                'keepalives_interval': 10,
                'keepalives_count': 5,
            }
        }
    }
else:
    logger.warning("RDS environment variables not found. Using default database settings if available.")

# Configure static files for EB
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Ensure staticfiles directory exists
if not os.path.exists(STATIC_ROOT):
    try:
        os.makedirs(STATIC_ROOT)
        logger.info(f"Created staticfiles directory at {STATIC_ROOT}")
    except Exception as e:
        logger.warning(f"Failed to create staticfiles directory: {str(e)}")

# Configure logging for EB
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s',
        },
        'simple': {
            'format': '%(levelname)s %(message)s',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOGS_DIR, 'django.log'),
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'eb_application': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'eb_settings': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

# Security settings for EB
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Disable debug toolbar in production
if 'debug_toolbar' in INSTALLED_APPS:
    INSTALLED_APPS.remove('debug_toolbar')
    MIDDLEWARE = [m for m in MIDDLEWARE if 'debug_toolbar' not in m]

# Redis settings - use ElastiCache if available
REDIS_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}'

# Celery settings - conditionally enabled based on Redis availability
try:
    import redis
    redis_client = redis.Redis(host=REDIS_HOST, port=int(REDIS_PORT), socket_connect_timeout=5)
    redis_client.ping()  # Test Redis connection
    logger.info("Redis connection successful, enabling Celery")
    
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    CELERY_ACCEPT_CONTENT = ['json']
    CELERY_TASK_SERIALIZER = 'json'
    CELERY_RESULT_SERIALIZER = 'json'
    CELERY_TIMEZONE = TIME_ZONE if 'TIME_ZONE' in globals() else 'UTC'
    
except Exception as e:
    logger.warning(f"Redis connection failed: {str(e)}. Disabling Celery.")
    # Configure Celery to use a dummy broker
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_BROKER_URL = 'memory://'
    CELERY_RESULT_BACKEND = 'file:///tmp/celery-results'

logger.info("Elastic Beanstalk settings loaded successfully")
"""

    # Write updated content back to file
    with open(SETTINGS_EB_FILE, 'w') as f:
        f.write(updated_content)

    print(f"Enhanced {SETTINGS_EB_FILE} with more robust configuration")
    return True

def update_script_registry():
    """Update the script registry with information about this script."""
    registry_file = os.path.join(PROJECT_ROOT, "scripts", "script_registry.js")
    if not os.path.exists(registry_file):
        print(f"Warning: Script registry file {registry_file} not found. Skipping update.")
        return True

    with open(registry_file, 'r') as f:
        content = f.read()

    # Check if this script already exists in the registry
    if "Version0008_fix_eb_deployment_settings" in content:
        print("Script already exists in registry. Skipping update.")
        return True

    # Find the position to insert the new entry
    insert_pos = content.find('const scriptRegistry = [') + len('const scriptRegistry = [')

    # Prepare new entry
    new_entry = """
  {
    id: "Version0008_fix_eb_deployment_settings",
    name: "Enhanced EB Deployment Settings",
    purpose: "Improves error handling, logging, and runtime stability for Elastic Beanstalk deployment",
    targetFiles: [
      "application.py",
      "pyfactor/settings_eb.py"
    ],
    executionDate: "2025-05-15",
    executionStatus: "SUCCESS",
    author: "DevOps Team",
    notes: "Enhances application.py and settings_eb.py with better error handling, logging, and fallback configurations for Elastic Beanstalk deployment"
  },"""

    # Insert the new entry
    updated_content = content[:insert_pos] + new_entry + content[insert_pos:]

    with open(registry_file, 'w') as f:
        f.write(updated_content)

    print(f"Updated script registry at {registry_file}")
    return True

def main():
    """Main function to enhance the Elastic Beanstalk deployment configuration."""
    print("Starting Elastic Beanstalk deployment settings enhancement...")
    
    # Enhance application.py
    app_enhanced = enhance_application_file()
    
    # Enhance settings_eb.py
    settings_enhanced = enhance_settings_eb_file()
    
    # Update script registry
    registry_updated = update_script_registry()
    
    # Print summary
    print("\nElastic Beanstalk Deployment Settings Enhancement Results:")
    print(f"✓ application.py: {'Enhanced' if app_enhanced else 'Failed'}")
    print(f"✓ settings_eb.py: {'Enhanced' if settings_enhanced else 'Failed'}")
    print(f"✓ Script registry: {'Updated' if registry_updated else 'Failed to update'}")
    
    if app_enhanced and settings_enhanced:
        print("\nAll enhancements applied successfully!")
        print("Next steps:")
        print("1. Review the changes to application.py and settings_eb.py")
        print("2. Deploy the changes to Elastic Beanstalk with: eb deploy")
        print("3. Or create a new environment with: eb create pyfactor-env-new -p python-3.9 -i t3.small")
        return 0
    else:
        print("\nSome enhancements could not be applied. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
