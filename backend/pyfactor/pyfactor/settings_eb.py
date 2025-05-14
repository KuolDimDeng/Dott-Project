"""
Production settings for Django application on AWS Elastic Beanstalk
"""

import os
from .settings import *  # Import base settings

# Override debug setting for production
DEBUG = False

# Security settings for production
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Allow Elastic Beanstalk URL in allowed hosts
ALLOWED_HOSTS = [
    '.elasticbeanstalk.com',
    os.environ.get('ALLOWED_HOSTS', ''),
]

# Get the CORS allowed origins from environment variables
CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') 
    if origin.strip()
]

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
                'application_name': 'pyfactor',
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
        }
    }

    # If tax database is used, also configure it with environment variables
    if 'TAX_RDS_HOSTNAME' in os.environ:
        DATABASES['taxes'] = {
            'ENGINE': 'dj_db_conn_pool.backends.postgresql',
            'NAME': os.environ.get('TAX_RDS_DB_NAME', os.environ.get('RDS_DB_NAME', '')),
            'USER': os.environ.get('TAX_RDS_USERNAME', os.environ.get('RDS_USERNAME', '')),
            'PASSWORD': os.environ.get('TAX_RDS_PASSWORD', os.environ.get('RDS_PASSWORD', '')),
            'HOST': os.environ.get('TAX_RDS_HOSTNAME', os.environ.get('RDS_HOSTNAME', '')),
            'PORT': os.environ.get('TAX_RDS_PORT', os.environ.get('RDS_PORT', '5432')),
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

# Static files configuration for AWS
STATIC_ROOT = os.path.join(BASE_DIR, 'static') 