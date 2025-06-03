"""
Django settings for pyfactor project (Elastic Beanstalk Production - Optimized).
Cost Optimized for $40/month single instance deployment.
"""

import os
from pathlib import Path
import sys
import logging
import logging.config
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')

# AWS Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID', '')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', '')
AWS_DEFAULT_REGION = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
AWS_REGION = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')  # Alias for cognito client

# Stripe Configuration
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', 'sk_test_dummy_key_for_development')
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY', 'pk_test_dummy_key_for_development')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# Update ALLOWED_HOSTS - simplified for single instance
DJANGO_ALLOWED_HOSTS_ENV = os.getenv('DJANGO_ALLOWED_HOSTS', '*')

# Essential hosts for single instance deployment
REQUIRED_HOSTS = [
    '.elasticbeanstalk.com',
    'dottapps.com',
    'api.dottapps.com',
    'www.dottapps.com',
    'localhost',
    '127.0.0.1',
]

if DJANGO_ALLOWED_HOSTS_ENV == '*':
    ALLOWED_HOSTS = ['*']
else:
    custom_hosts = [host.strip() for host in DJANGO_ALLOWED_HOSTS_ENV.split(',') if host.strip()]
    ALLOWED_HOSTS = list(set(custom_hosts + REQUIRED_HOSTS))

# Application definition
SHARED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'health',
    'django.contrib.sites',
    'django_celery_beat',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'django_countries',
    'rest_framework.authtoken',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'django_cryptography',
    'phonenumber_field',
    'django_extensions',
    'custom_auth',
    'onboarding.apps.OnboardingConfig',
)

TENANT_APPS = (
    'users.apps.UsersConfig',
    'sales',
    'finance',
    'reports',
    'banking',
    'payments',
    'payroll',
    'inventory',
    'analysis',
    'chart',
    'integrations',
    'taxes',
    'purchases',
    'barcode',
    'hr.apps.HrConfig',
    'crm.apps.CrmConfig',
    'transport.apps.TransportConfig',
)

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

# Ensure corsheaders is in installed apps
if 'corsheaders' not in INSTALLED_APPS:
    INSTALLED_APPS = ['corsheaders'] + list(INSTALLED_APPS)

MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'pyfactor.health_check.HealthCheckMiddleware',  # Add health check middleware first
    'corsheaders.middleware.CorsMiddleware',  # Added at top
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'custom_auth.middleware.TokenRefreshMiddleware',  # Add Token Refresh Middleware
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'custom_auth.enhanced_rls_middleware.EnhancedRowLevelSecurityMiddleware',  # Use enhanced RLS middleware
    'hr.middleware.HrCorsMiddleware',  # Add HR CORS middleware
    'onboarding.middleware.SchemaNameMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'custom_auth.middleware.RequestIDMiddleware',
    'custom_auth.middleware.TenantMiddleware',
    'custom_auth.dashboard_middleware.DashboardMigrationMiddleware',
]

# CORS settings for production
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    'https://dottapps.com',
    'https://www.dottapps.com',
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://dottapps\.com$',
    r'^https://.*\.dottapps\.com$',
]

# CSRF settings for production
CSRF_TRUSTED_ORIGINS = [
    'https://dottapps.com',
    'https://www.dottapps.com',
    'https://api.dottapps.com',
]

# Security settings - optimized for single instance
SECURE_SSL_REDIRECT = False  # Single instance handles this differently
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Production domain settings
SESSION_COOKIE_DOMAIN = '.dottapps.com'
CSRF_COOKIE_DOMAIN = '.dottapps.com'

# OPTIMIZED Database settings for single instance RDS
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('RDS_DB_NAME', 'dott_main'),
        'USER': os.environ.get('RDS_USERNAME', 'dott_admin'),
        'PASSWORD': os.environ.get('RDS_PASSWORD', 'RRfXU6uPPUbBEg1JqGTJ'),
        'HOST': os.environ.get('RDS_HOSTNAME', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'),
        'PORT': os.environ.get('RDS_PORT', '5432'),
        'CONN_MAX_AGE': 600,  # Keep connections alive longer for single instance
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'connect_timeout': 10,
            'client_encoding': 'UTF8',
            'application_name': 'dott-optimized',
            'sslmode': 'require',
            # Optimize for fewer connections
            'CONN_MAX_AGE': 600,
            'MAX_CONNS': 20,  # Limit connections for single instance
        },
    },
    'taxes': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('RDS_DB_NAME', 'dott_main'),
        'USER': os.environ.get('RDS_USERNAME', 'dott_admin'),
        'PASSWORD': os.environ.get('RDS_PASSWORD', 'RRfXU6uPPUbBEg1JqGTJ'),
        'HOST': os.environ.get('RDS_HOSTNAME', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'),
        'PORT': os.environ.get('RDS_PORT', '5432'),
        'CONN_MAX_AGE': 600,
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'connect_timeout': 10,
            'client_encoding': 'UTF8',
            'sslmode': 'require',
            'MAX_CONNS': 10,  # Fewer connections for taxes DB
        },
    }
}

ROOT_URLCONF = 'pyfactor.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
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

WSGI_APPLICATION = 'pyfactor.wsgi.application'
ASGI_APPLICATION = 'pyfactor.asgi.application'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
SITE_ID = 1

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default auto field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Authentication settings
AUTH_USER_MODEL = 'custom_auth.User'

# Update the FRONTEND_URL
FRONTEND_URL = 'https://dottapps.com'

# OPTIMIZED Redis/Cache settings for single instance
# Use local memory cache instead of Redis to save costs
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'dott-optimized-cache',
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
            'CULL_FREQUENCY': 4,
        }
    }
}

# OPTIMIZED Celery settings for single instance
# Use the database as broker instead of Redis to save costs
CELERY_BROKER_URL = 'django://'
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'django-cache'

# Optimize Celery for t3.small
CELERY_WORKER_MAX_TASKS_PER_CHILD = 50  # Restart workers to prevent memory leaks
CELERY_WORKER_CONCURRENCY = 2  # Limit workers for t3.small
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_MAX_MEMORY_PER_CHILD = 200000  # 200MB per worker

# Add required Celery Django database tables
INSTALLED_APPS += ['kombu.transport.django', 'django_celery_results']

# Define AWS Cognito Settings
COGNITO_USER_POOL_ID = os.getenv('AWS_COGNITO_USER_POOL_ID', 'us-east-1_JPL8vGfb6')
COGNITO_APP_CLIENT_ID = os.getenv('AWS_COGNITO_CLIENT_ID', '1o5v84mrgn4gt87khtr179uc5b') 
COGNITO_DOMAIN = os.getenv('AWS_COGNITO_DOMAIN', 'pyfactor-dev.auth.us-east-1.amazoncognito.com')
USE_AWS_AUTH = True

# AWS Authentication Settings
COGNITO_AWS_REGION = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
COGNITO_USER_POOL = COGNITO_USER_POOL_ID
COGNITO_TOKEN_VERIFY = True
COGNITO_ATTR_MAPPING = {
    'email': 'email',
    'given_name': 'first_name',
    'family_name': 'last_name',
    'custom:userrole': 'role',
    'custom:businessid': 'business_id',
    'custom:businessname': 'business_name',
    'custom:businesstype': 'business_type',
    'custom:businesscountry': 'business_country',
    'custom:legalstructure': 'legal_structure',
    'custom:datefounded': 'date_founded',
    'custom:subplan': 'subscription_plan',
    'custom:subscriptioninterval': 'subscription_interval',
    'custom:onboarding': 'onboarding_status',
    'custom:setupdone': 'setup_complete'
}

# REST Framework settings - optimized
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'custom_auth.jwt.CognitoJWTAuthentication',
        'custom_auth.authentication.CognitoAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'custom_auth.permissions.SetupEndpointPermission',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    'EXCEPTION_HANDLER': 'custom_auth.utils.custom_exception_handler',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10/minute',  # Slightly higher for single instance
        'user': '100/minute',  # Higher rate for single instance users
        'tax_calculation': '200/day',  # More generous for single instance
    },
}

# JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'sub',
}

# Authentication settings for dj-rest-auth and allauth
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_EMAIL_REQUIRED = False
SOCIALACCOUNT_QUERY_EMAIL = True
SOCIALACCOUNT_AUTO_SIGNUP = True

# OPTIMIZED Logging configuration for single instance
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'level': 'WARNING',  # Reduced logging to save resources
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',  # Only log warnings and errors
            'propagate': False,
        },
        'celery': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# Environment-specific variables
DJANGO_SETTINGS_MODULE = 'pyfactor.settings_eb_optimized'
ENVIRONMENT = 'production-optimized'
PORT = 8000
EB_ENV_NAME = 'Dott-env-optimized'
DOMAIN = 'dottapps.com'
API_DOMAIN = 'api.dottapps.com'

# Static files configuration optimized for single instance
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Whitenoise configuration - optimized
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = False  # Disable in production for performance
WHITENOISE_MAX_AGE = 31536000  # 1 year cache for static files 