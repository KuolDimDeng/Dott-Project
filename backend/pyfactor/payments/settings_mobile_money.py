"""
Mobile Money Settings Configuration
Add these to your Django settings.py file
"""

import os

# ============================================
# MOBILE MONEY PAYMENT SETTINGS
# ============================================

# General Settings
PAYMENT_TEST_MODE = os.environ.get('PAYMENT_TEST_MODE', 'True') == 'True'
PAYMENT_CALLBACK_BASE_URL = os.environ.get('PAYMENT_CALLBACK_BASE_URL', 'https://staging.dottapps.com')
SITE_NAME = 'Dott'

# ============================================
# MTN MOMO SETTINGS
# ============================================

# Sandbox Settings (for testing)
MOMO_SANDBOX_SUBSCRIPTION_KEY = os.environ.get('MOMO_SANDBOX_SUBSCRIPTION_KEY', '326d22e6674c4d0e93831b138f4d6407')
MOMO_CALLBACK_HOST = os.environ.get('MOMO_CALLBACK_HOST', 'dottapps.com')

# Production Settings
MOMO_PRODUCTION_SUBSCRIPTION_KEY = os.environ.get('MOMO_PRODUCTION_SUBSCRIPTION_KEY', '')
MOMO_API_USER = os.environ.get('MOMO_API_USER', '')
MOMO_API_KEY = os.environ.get('MOMO_API_KEY', '')
MOMO_DEFAULT_CURRENCY = os.environ.get('MOMO_DEFAULT_CURRENCY', 'UGX')
MOMO_WEBHOOK_SECRET = os.environ.get('MOMO_WEBHOOK_SECRET', '')

# ============================================
# M-PESA SETTINGS
# ============================================

# Sandbox Settings (for testing)
MPESA_SANDBOX_CONSUMER_KEY = os.environ.get('MPESA_SANDBOX_CONSUMER_KEY', 'your_sandbox_consumer_key')
MPESA_SANDBOX_CONSUMER_SECRET = os.environ.get('MPESA_SANDBOX_CONSUMER_SECRET', 'your_sandbox_consumer_secret')
MPESA_SANDBOX_SHORTCODE = os.environ.get('MPESA_SANDBOX_SHORTCODE', '174379')
MPESA_SANDBOX_PASSKEY = os.environ.get('MPESA_SANDBOX_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919')

# Production Settings
MPESA_CONSUMER_KEY = os.environ.get('MPESA_CONSUMER_KEY', '')
MPESA_CONSUMER_SECRET = os.environ.get('MPESA_CONSUMER_SECRET', '')
MPESA_SHORTCODE = os.environ.get('MPESA_SHORTCODE', '')
MPESA_PASSKEY = os.environ.get('MPESA_PASSKEY', '')
MPESA_INITIATOR_NAME = os.environ.get('MPESA_INITIATOR_NAME', '')
MPESA_INITIATOR_PASSWORD = os.environ.get('MPESA_INITIATOR_PASSWORD', '')

# Callback URLs
MPESA_CALLBACK_URL = os.environ.get('MPESA_CALLBACK_URL', f'{PAYMENT_CALLBACK_BASE_URL}/api/payments/mobile-money/webhook/mpesa')

# Security - Allowed IPs for webhooks (production only)
MPESA_ALLOWED_IPS = os.environ.get('MPESA_ALLOWED_IPS', '').split(',') if os.environ.get('MPESA_ALLOWED_IPS') else []

# ============================================
# DATABASE ENCRYPTION
# ============================================

# For encrypting sensitive fields in database
# Generate with: from cryptography.fernet import Fernet; print(Fernet.generate_key())
FIELD_ENCRYPTION_KEY = os.environ.get('FIELD_ENCRYPTION_KEY', 'your_encryption_key_here')

# ============================================
# CELERY SETTINGS (for async processing)
# ============================================

# Celery task for checking payment status
CELERY_BEAT_SCHEDULE = {
    'check-pending-payments': {
        'task': 'payments.tasks.check_pending_payments',
        'schedule': 60.0,  # Every minute
    },
    'process-webhook-retries': {
        'task': 'payments.tasks.process_webhook_retries',
        'schedule': 300.0,  # Every 5 minutes
    },
}

# ============================================
# LOGGING CONFIGURATION
# ============================================

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
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/django/mobile_money.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
    },
    'loggers': {
        'payments': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# ============================================
# RATE LIMITING
# ============================================

# Rate limiting for payment APIs
RATELIMIT_ENABLE = True
RATELIMIT_VIEW = '10/m'  # 10 requests per minute per view

# ============================================
# CACHING
# ============================================

# Cache configuration for storing tokens
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'mobile_money',
        'TIMEOUT': 3600,  # 1 hour default
    }
}

# ============================================
# SECURITY SETTINGS
# ============================================

# Security headers for payment endpoints
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = not PAYMENT_TEST_MODE
SESSION_COOKIE_SECURE = not PAYMENT_TEST_MODE
CSRF_COOKIE_SECURE = not PAYMENT_TEST_MODE
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# CORS settings for mobile app
CORS_ALLOWED_ORIGINS = [
    "https://app.dottapps.com",
    "https://staging.dottapps.com",
    "capacitor://app.dottapps.com",  # For mobile app
]

# ============================================
# MONITORING & ALERTS
# ============================================

# Sentry configuration for error tracking
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

if not PAYMENT_TEST_MODE:
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN', ''),
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment='production' if not PAYMENT_TEST_MODE else 'sandbox',
    )

# ============================================
# TRANSACTION LIMITS
# ============================================

# Transaction limits per currency
TRANSACTION_LIMITS = {
    'USD': {'min': 1, 'max': 10000, 'daily_limit': 50000},
    'EUR': {'min': 1, 'max': 10000, 'daily_limit': 50000},
    'GBP': {'min': 1, 'max': 10000, 'daily_limit': 50000},
    'KES': {'min': 100, 'max': 150000, 'daily_limit': 500000},
    'UGX': {'min': 1000, 'max': 5000000, 'daily_limit': 20000000},
    'TZS': {'min': 1000, 'max': 5000000, 'daily_limit': 20000000},
    'NGN': {'min': 100, 'max': 1000000, 'daily_limit': 5000000},
    'ZAR': {'min': 10, 'max': 50000, 'daily_limit': 200000},
    'GHS': {'min': 1, 'max': 10000, 'daily_limit': 50000},
}