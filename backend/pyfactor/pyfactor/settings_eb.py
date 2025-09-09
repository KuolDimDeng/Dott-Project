"""
Django settings for pyfactor project (Elastic Beanstalk Production).
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
AWS_REGION = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')  # AWS region for services

# Stripe Configuration
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', 'sk_test_dummy_key_for_development')
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY', 'pk_test_dummy_key_for_development')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# Update ALLOWED_HOSTS with the Elastic Beanstalk domain and our custom domain
# Allow all AWS internal IPs for health checks and load balancers
DJANGO_ALLOWED_HOSTS_ENV = os.getenv('DJANGO_ALLOWED_HOSTS', '*')

# Essential hosts that must always be included for AWS health checks
REQUIRED_HOSTS = [
    '.elasticbeanstalk.com',
    'dottapps.com',
    'api.dottapps.com',
    'www.dottapps.com',
    'localhost',
    '127.0.0.1',
    # AWS internal IPs for load balancer health checks (from logs)
    '172.31.44.125',  # Internal instance IP
    '172.31.38.137',  # ELB health checker IP 
    '172.31.73.55',   # ELB health checker IP
    '172.31.34.90',   # ELB health checker IP
    '54.83.126.185',  # External IP
    '172.31.42.237',  # ELB health checker IP
    '172.31.7.76',    # ELB health checker IP  
    '172.31.73.73',   # ELB health checker IP
]

if DJANGO_ALLOWED_HOSTS_ENV == '*':
    # Use wildcard but also include specific IPs for better compatibility
    ALLOWED_HOSTS = ['*'] + REQUIRED_HOSTS
else:
    # Parse comma-separated hosts and add required hosts
    custom_hosts = [host.strip() for host in DJANGO_ALLOWED_HOSTS_ENV.split(',') if host.strip()]
    ALLOWED_HOSTS = list(set(custom_hosts + REQUIRED_HOSTS))

# Application definition
# From original settings.py
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
    'marketplace.apps.MarketplaceConfig',  # Marketplace for businesses
    'chat.apps.ChatConfig',  # Chat functionality for marketplace
    'couriers.apps.CouriersConfig',  # Courier delivery service
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

# Security settings
# Allow HTTP for ELB health checks but redirect everything else to HTTPS
SECURE_SSL_REDIRECT = False  # Let the load balancer handle SSL termination
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Production domain settings
SESSION_COOKIE_DOMAIN = '.dottapps.com'
CSRF_COOKIE_DOMAIN = '.dottapps.com'

# Database settings for Render PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'dott_production'),
        'USER': os.environ.get('DB_USER', 'dott_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ'),
        'HOST': os.environ.get('DB_HOST', 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 300,  # Keep connections for 5 minutes
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'connect_timeout': 10,
            'client_encoding': 'UTF8',
            'application_name': 'dott',
            'sslmode': 'require',
        },
    },
    'taxes': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('TAX_DB_NAME', 'dott_production'),
        'USER': os.environ.get('TAX_DB_USER', 'dott_user'),
        'PASSWORD': os.environ.get('TAX_DB_PASSWORD', 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ'),
        'HOST': os.environ.get('TAX_DB_HOST', 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com'),
        'PORT': os.environ.get('TAX_DB_PORT', '5432'),
        'CONN_MAX_AGE': 300,
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'connect_timeout': 10,
            'client_encoding': 'UTF8',
            'sslmode': 'require',
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

# Redis settings - use ElastiCache if available
REDIS_HOST = os.environ.get('REDIS_HOST')
REDIS_PORT = os.environ.get('REDIS_PORT', 6379)

# Only configure Redis if explicitly provided
if REDIS_HOST:
    REDIS_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}'
    CELERY_BROKER_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}/0'
    CELERY_RESULT_BACKEND = f'redis://{REDIS_HOST}:{REDIS_PORT}/0'
    
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/1',
            'OPTIONS': {
                'db': 1,
                'parser_class': 'redis.connection.DefaultParser',
                'pool_class': 'redis.connection.ConnectionPool',
                'socket_timeout': 5,
                'socket_connect_timeout': 5,
                'retry_on_timeout': True,
                'max_connections': 100,
            },
            'KEY_PREFIX': '{tenant}',
        }
    }
else:
    # No Redis configured - use dummy cache backend
    REDIS_URL = None
    CELERY_BROKER_URL = None
    CELERY_RESULT_BACKEND = None
    
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }

# Define Auth0 Settings (Primary Authentication)
AUTH0_DOMAIN = os.getenv('AUTH0_DOMAIN', 'dev-cbyy63jovi6zrcos.us.auth0.com')
AUTH0_CLIENT_ID = os.getenv('AUTH0_CLIENT_ID', '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF')
AUTH0_CLIENT_SECRET = os.getenv('AUTH0_CLIENT_SECRET', '')
AUTH0_AUDIENCE = os.getenv('AUTH0_AUDIENCE', f'https://{AUTH0_DOMAIN}/api/v2/')
AUTH0_ISSUER = f"https://{AUTH0_DOMAIN}/"

# Authentication Provider Configuration
USE_AUTH0 = True  # Always use Auth0

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'custom_auth.auth0_authentication.Auth0JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',  # Fallback for admin
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '5/minute',
        'user': '60/minute',
        'tax_calculation': '100/day',  # Custom rate for tax calculations
    },
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S.%fZ',
}

# Authentication settings for dj-rest-auth and allauth
ACCOUNT_LOGIN_METHODS = {'email'}  # Updated from deprecated ACCOUNT_AUTHENTICATION_METHOD
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']  # Replaces ACCOUNT_EMAIL_REQUIRED and ACCOUNT_USERNAME_REQUIRED
ACCOUNT_USER_MODEL_USERNAME_FIELD = None  # Explicitly set no username field
ACCOUNT_EMAIL_VERIFICATION = 'none'  # Set to 'none' for development
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_EMAIL_REQUIRED = False
SOCIALACCOUNT_QUERY_EMAIL = True
SOCIALACCOUNT_AUTO_SIGNUP = True

# Setup a minimal logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(message)s',
        },
        'json': {
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
            'datefmt': '%Y-%m-%dT%H:%M:%S%z',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# Environment-specific variables to override
DJANGO_SETTINGS_MODULE = 'pyfactor.settings_eb'
ENVIRONMENT = 'production'
PORT = 8000
EB_ENV_NAME = 'Dott-env-fixed'
DOMAIN = 'dottapps.com'
API_DOMAIN = 'api.dottapps.com'

# Static files configuration for Docker deployment
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Whitenoise configuration
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True
