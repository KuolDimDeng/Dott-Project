"""
Django settings for Elastic Beanstalk deployment.
Enhanced by Version0008_fix_eb_deployment_settings.py script.
"""

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
