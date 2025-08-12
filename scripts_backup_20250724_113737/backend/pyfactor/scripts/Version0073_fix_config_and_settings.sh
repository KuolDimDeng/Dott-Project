#!/bin/bash

# Version0073_fix_config_and_settings.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix configuration format and add missing settings_eb.py module

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== FIXING DJANGO CONFIGURATION FOR AWS ELASTIC BEANSTALK =====${NC}"
echo -e "${YELLOW}This script fixes configuration format issues and adds the missing settings_eb.py module${NC}"

# Configuration
FIXED_PACKAGE="fixed-eb-package-20250522_113100.zip"
NEW_PACKAGE="fixed-django-config-$(date +%Y%m%d%H%M%S).zip"
TEMP_DIR="temp_fix_$(date +%Y%m%d%H%M%S)"

# Check if the fixed package exists
if [ ! -f "$FIXED_PACKAGE" ]; then
    echo -e "${RED}Error: Fixed package $FIXED_PACKAGE not found${NC}"
    echo -e "${YELLOW}Run Version0071_fix_django_config.sh first to create the package${NC}"
    exit 1
fi

# Create temporary directory
echo -e "${YELLOW}Creating temporary directory...${NC}"
mkdir -p "$TEMP_DIR"

# Extract the package
echo -e "${YELLOW}Extracting package to temporary directory...${NC}"
unzip -q "$FIXED_PACKAGE" -d "$TEMP_DIR"

# Check for config file
CONFIG_FILE="$TEMP_DIR/.ebextensions/04_django_docker.config"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Config file .ebextensions/04_django_docker.config not found in package${NC}"
    echo -e "${YELLOW}Creating the config file...${NC}"
    
    # Ensure .ebextensions directory exists
    mkdir -p "$TEMP_DIR/.ebextensions"
    
    # Create a properly formatted config file
    cat > "$CONFIG_FILE" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
  aws:elasticbeanstalk:container:python:
    WSGIPath: pyfactor.wsgi:application
EOF
else
    echo -e "${YELLOW}Fixing format of .ebextensions/04_django_docker.config...${NC}"
    # Backup the original config
    cp "$CONFIG_FILE" "${CONFIG_FILE}.bak"
    
    # Create a properly formatted config file
    cat > "$CONFIG_FILE" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
  aws:elasticbeanstalk:container:python:
    WSGIPath: pyfactor.wsgi:application
EOF
fi

echo -e "${GREEN}✓ Config file fixed with proper format${NC}"

# Check for settings_eb.py
SETTINGS_FILE="$TEMP_DIR/pyfactor/settings_eb.py"
if [ ! -f "$SETTINGS_FILE" ]; then
    echo -e "${RED}Error: settings_eb.py not found in package${NC}"
    echo -e "${YELLOW}Creating settings_eb.py module...${NC}"
    
    # Check if settings.py exists to base our settings_eb.py on
    BASE_SETTINGS="$TEMP_DIR/pyfactor/settings.py"
    if [ -f "$BASE_SETTINGS" ]; then
        echo -e "${BLUE}Found settings.py, using it as a base for settings_eb.py${NC}"
        
        # Create settings_eb.py based on settings.py
        cat > "$SETTINGS_FILE" << 'EOF'
"""
Django settings for Elastic Beanstalk deployment.
Imports from base settings.py and overrides specific settings for EB.
"""
from .settings import *

# Override DEBUG setting for production
DEBUG = False

# Allow Elastic Beanstalk domain
ALLOWED_HOSTS = ['*']

# Database settings for RDS
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('RDS_DB_NAME', ''),
        'USER': os.environ.get('RDS_USERNAME', ''),
        'PASSWORD': os.environ.get('RDS_PASSWORD', ''),
        'HOST': os.environ.get('RDS_HOSTNAME', ''),
        'PORT': os.environ.get('RDS_PORT', '5432'),
    }
}

# Static files configuration for S3
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Media files configuration
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# Security settings
SECURE_SSL_REDIRECT = False  # Let load balancer handle SSL
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': '/var/log/app/django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': True,
        },
    },
}
EOF
    else
        echo -e "${YELLOW}No settings.py found, creating a generic settings_eb.py${NC}"
        
        # Create a generic settings_eb.py
        cat > "$SETTINGS_FILE" << 'EOF'
"""
Django settings for Elastic Beanstalk deployment.
"""
import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-default-key')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'pyfactor.urls'

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

WSGI_APPLICATION = 'pyfactor.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('RDS_DB_NAME', ''),
        'USER': os.environ.get('RDS_USERNAME', ''),
        'PASSWORD': os.environ.get('RDS_PASSWORD', ''),
        'HOST': os.environ.get('RDS_HOSTNAME', ''),
        'PORT': os.environ.get('RDS_PORT', '5432'),
    }
}

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
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Media files
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': '/var/log/app/django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': True,
        },
    },
}
EOF
    fi
    
    echo -e "${GREEN}✓ Created settings_eb.py module${NC}"
else
    echo -e "${GREEN}✓ settings_eb.py already exists in the package${NC}"
fi

# Create a new Dockerfile with proper settings
DOCKERFILE="$TEMP_DIR/Dockerfile"
echo -e "${YELLOW}Updating Dockerfile to use settings_eb.py...${NC}"
cat > "$DOCKERFILE" << 'EOF'
FROM python:3.12-slim

LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

# Create directory for logs
RUN mkdir -p /var/log/app && \
    chmod 777 /var/log/app

# Expose the application port
EXPOSE 8000

# Run gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "pyfactor.wsgi:application"]
EOF

echo -e "${GREEN}✓ Updated Dockerfile${NC}"

# Create or update requirements.txt
REQUIREMENTS="$TEMP_DIR/requirements.txt"
echo -e "${YELLOW}Updating requirements.txt...${NC}"
cat > "$REQUIREMENTS" << 'EOF'
Django>=4.2,<5.0
psycopg2-binary>=2.9.6
gunicorn>=21.2.0
whitenoise>=6.5.0
requests>=2.31.0
python-dotenv>=1.0.0
EOF

echo -e "${GREEN}✓ Updated requirements.txt${NC}"

# Create the new package
echo -e "${YELLOW}Creating new package...${NC}"
cd "$TEMP_DIR" && zip -r "../$NEW_PACKAGE" * .ebextensions .platform .dockerignore 2>/dev/null
cd ..

# Check if package was created successfully
if [ ! -f "$NEW_PACKAGE" ]; then
    echo -e "${RED}Error: Failed to create new package${NC}"
    exit 1
fi

PACKAGE_SIZE=$(du -h "$NEW_PACKAGE" | cut -f1)
echo -e "${GREEN}✓ Created new package: $NEW_PACKAGE ($PACKAGE_SIZE)${NC}"

# Clean up temporary directory
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ Cleanup complete${NC}"

echo -e "${BLUE}============== FIXES APPLIED SUCCESSFULLY ==============${NC}"
echo -e "${GREEN}1. Fixed format of .ebextensions/04_django_docker.config${NC}"
echo -e "${GREEN}2. Added missing pyfactor/settings_eb.py module${NC}"
echo -e "${GREEN}3. Updated Dockerfile to use settings_eb.py${NC}"
echo -e "${GREEN}4. Updated requirements.txt${NC}"
echo -e "${BLUE}=======================================================${NC}"

echo -e "${YELLOW}To deploy the fixed package, run:${NC}"
echo -e "${BLUE}./scripts/Version0072_deploy_fixed_package.sh${NC}"
echo -e "${YELLOW}(Update the FIXED_PACKAGE variable in the script to: $NEW_PACKAGE)${NC}" 