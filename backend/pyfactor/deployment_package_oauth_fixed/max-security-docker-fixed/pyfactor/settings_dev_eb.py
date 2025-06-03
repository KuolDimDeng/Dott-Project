"""
Development environment settings for Django application on AWS Elastic Beanstalk
"""

import os
from .settings import *  # Import base settings

# Enable debug for development environment
DEBUG = True

# Security settings for development (less strict)
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Allow Elastic Beanstalk URL in allowed hosts
ALLOWED_HOSTS = [
    '.elasticbeanstalk.com',
    'localhost',
    '127.0.0.1',
    os.environ.get('ALLOWED_HOSTS', ''),
]

# Enable CORS for development
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    # Local development
    'https://localhost:3000',
    'https://127.0.0.1:3000',
    # Backend URLs
    'https://localhost:8000',
    'https://127.0.0.1:8000',
]

# Parse additional CORS origins from environment
if os.environ.get('CORS_ALLOWED_ORIGINS'):
    additional_origins = [
        origin.strip() for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') 
        if origin.strip()
    ]
    CORS_ALLOWED_ORIGINS.extend(additional_origins)

# Override database settings with AWS RDS environment variables
if 'RDS_HOSTNAME' in os.environ:
    DATABASES = {
        'default': {
            'ENGINE': 'dj_db_conn_pool.backends.postgresql',
            'NAME': os.environ.get('RDS_DB_NAME', ''),
            'USER': os.environ.get('RDS_USERNAME', ''),
            'PASSWORD': os.environ.get('RDS_PASSWORD', ''),
            'HOST': os.environ.get('RDS_HOSTNAME', ''),
            'PORT': os.environ.get('RDS_PORT', '5432'),
            'TIME_ZONE': 'UTC',
            'CONN_MAX_AGE': 0,
            'AUTOCOMMIT': True,
            'CONN_HEALTH_CHECKS': True,
            'OPTIONS': {
                'connect_timeout': 10,
                'client_encoding': 'UTF8',
                'application_name': 'pyfactor_dev',
                'sslmode': 'require',
                'keepalives': 1,
                'keepalives_idle': 30,
                'keepalives_interval': 10,
                'keepalives_count': 5,
            },
            'POOL_OPTIONS': {
                'POOL_SIZE': 3,           # Smaller pool for dev
                'MAX_OVERFLOW': 2,
                'RECYCLE': 300,
                'TIMEOUT': 30,
                'RETRY': 3,
                'RECONNECT': True,
                'DISABLE_POOLING': False,
            }
        }
    }

# Enhanced logging for development
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.db.backends': {
            'level': 'INFO',
            'handlers': ['console'],
            'propagate': False,
        },
    },
}

# Static files configuration
STATIC_ROOT = os.path.join(BASE_DIR, 'static') 