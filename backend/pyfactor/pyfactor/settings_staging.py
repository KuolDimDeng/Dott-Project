"""
Staging-specific settings for Dott
Inherits from base settings but overrides for staging environment
"""

from .settings import *
import os

# Override environment
ENVIRONMENT = 'staging'
DEBUG = False

# Security - use different secret key for staging
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'staging-default-key-change-this')

# Database - uses staging database from environment
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Disable Redis completely for staging - use database for everything
REDIS_URL = None

# Session configuration - use database instead of Redis
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_NAME = 'staging_sessionid'  # Different from production
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# Cache configuration - use dummy cache (no caching)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Celery - use database instead of Redis
CELERY_BROKER_URL = 'django-db://'
CELERY_RESULT_BACKEND = 'django-db://'
CELERY_TASK_ALWAYS_EAGER = True  # Execute tasks immediately in staging

# Email - use console backend for staging
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Static and Media files
STATIC_URL = '/static/'
MEDIA_URL = '/media/'

# CORS - allow staging frontend
CORS_ALLOWED_ORIGINS = [
    "https://dott-staging.onrender.com",
    "http://localhost:3000",  # For local testing
]

# Stripe - use test keys
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')

# Auth0 - same as production but could use different tenant
AUTH0_DOMAIN = os.environ.get('AUTH0_DOMAIN', 'dev-cbyy63jovi6zrcos.us.auth0.com')
AUTH0_CLIENT_ID = os.environ.get('AUTH0_CLIENT_ID', '')
AUTH0_CLIENT_SECRET = os.environ.get('AUTH0_CLIENT_SECRET', '')

# Logging - more verbose for staging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
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
            'propagate': False,
        },
        'pyfactor': {
            'handlers': ['console'],
            'level': 'DEBUG',  # More verbose for staging
            'propagate': False,
        },
    },
}

# Disable Sentry for staging (optional)
SENTRY_DSN = None

print(f"🔧 STAGING SETTINGS LOADED - Redis disabled, using database for sessions/cache")