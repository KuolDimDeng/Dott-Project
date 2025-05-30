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

# Database settings for RDS
DATABASES = {
    'default': {
        'ENGINE': 'django_db_connection_pool.backends.postgresql',
        'NAME': os.environ.get('RDS_DB_NAME', 'dott_main'),
        'USER': os.environ.get('RDS_USERNAME', 'dott_admin'),
        'PASSWORD': os.environ.get('RDS_PASSWORD', 'RRfXU6uPPUbBEg1JqGTJ'),
        'HOST': os.environ.get('RDS_HOSTNAME', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'),
        'PORT': os.environ.get('RDS_PORT', '5432'),
        'TIME_ZONE': 'UTC',
        'CONN_MAX_AGE': 0,
        'AUTOCOMMIT': True,
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'connect_timeout': 10,
            'client_encoding': 'UTF8',
            'application_name': 'dott',
            'sslmode': 'require',
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5,
        },
        'POOL_OPTIONS': {
            'POOL_SIZE': 5,
            'MAX_OVERFLOW': 2,
            'RECYCLE': 300,
            'TIMEOUT': 30,
            'RETRY': 3,
            'RECONNECT': True,
            'DISABLE_POOLING': False,
        }
    },
    'taxes': {
        'ENGINE': 'django_db_connection_pool.backends.postgresql',
        'NAME': os.environ.get('RDS_DB_NAME', 'dott_main'),
        'USER': os.environ.get('RDS_USERNAME', 'dott_admin'),
        'PASSWORD': os.environ.get('RDS_PASSWORD', 'RRfXU6uPPUbBEg1JqGTJ'),
        'HOST': os.environ.get('RDS_HOSTNAME', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'),
        'PORT': os.environ.get('RDS_PORT', '5432'),
        'CONN_MAX_AGE': 0,
        'OPTIONS': {
            'connect_timeout': 10,
            'client_encoding': 'UTF8',
            'sslmode': 'require',
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5,
        },
        'POOL_OPTIONS': {
            'POOL_SIZE': 5,
            'MAX_OVERFLOW': 2,
            'RECYCLE': 300,
            'TIMEOUT': 30,
            'RETRY': 3,
            'RECONNECT': True,
        }
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
REDIS_HOST = os.environ.get('REDIS_HOST', '127.0.0.1')
REDIS_PORT = os.environ.get('REDIS_PORT', 6379)
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

# REST Framework settings
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
        'anon': '5/minute',
        'user': '60/minute',
        'tax_calculation': '100/day',  # Custom rate for tax calculations
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
ACCOUNT_USERNAME_REQUIRED = False  # Disable username requirement
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
