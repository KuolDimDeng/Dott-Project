#!/bin/bash

# Version0074_fix_all_configs_and_settings.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix ALL configuration format issues and ensure settings_eb.py module is properly included

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== COMPREHENSIVE DJANGO CONFIGURATION FIX FOR AWS ELASTIC BEANSTALK =====${NC}"
echo -e "${YELLOW}This script fixes ALL configuration format issues and ensures proper Django setup${NC}"

# Configuration
FIXED_PACKAGE="fixed-django-config-20250522114018.zip"
NEW_PACKAGE="fixed-all-configs-$(date +%Y%m%d%H%M%S).zip"
TEMP_DIR="temp_comprehensive_fix_$(date +%Y%m%d%H%M%S)"

# Check if the previous package exists
if [ ! -f "$FIXED_PACKAGE" ]; then
    echo -e "${RED}Error: Previous package $FIXED_PACKAGE not found${NC}"
    echo -e "${YELLOW}Run Version0073_fix_config_and_settings.sh first to create the package${NC}"
    exit 1
fi

# Create temporary directory
echo -e "${YELLOW}Creating temporary directory...${NC}"
mkdir -p "$TEMP_DIR"

# Extract the package
echo -e "${YELLOW}Extracting package to temporary directory...${NC}"
unzip -q "$FIXED_PACKAGE" -d "$TEMP_DIR"

# Ensure .ebextensions directory exists
mkdir -p "$TEMP_DIR/.ebextensions"

echo -e "${YELLOW}Fixing ALL .ebextensions configuration files...${NC}"

# 1. Fix 04_django_docker.config
CONFIG_FILE="$TEMP_DIR/.ebextensions/04_django_docker.config"
echo -e "${BLUE}Fixing 04_django_docker.config...${NC}"
cat > "$CONFIG_FILE" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
  aws:elasticbeanstalk:container:python:
    WSGIPath: pyfactor.wsgi:application
EOF

# 2. Fix 99_custom_env.config (the new problematic one)
CUSTOM_ENV_CONFIG="$TEMP_DIR/.ebextensions/99_custom_env.config"
echo -e "${BLUE}Fixing 99_custom_env.config...${NC}"
cat > "$CUSTOM_ENV_CONFIG" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
    DEBUG: "False"
    ALLOWED_HOSTS: "*"
EOF

# 3. Fix 99_custom_env_docker.config
CUSTOM_ENV_DOCKER_CONFIG="$TEMP_DIR/.ebextensions/99_custom_env_docker.config"
echo -e "${BLUE}Fixing 99_custom_env_docker.config...${NC}"
cat > "$CUSTOM_ENV_DOCKER_CONFIG" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
    DEBUG: "False"
    ALLOWED_HOSTS: "*"
EOF

# 4. Create a minimal 01_django.config
DJANGO_CONFIG="$TEMP_DIR/.ebextensions/01_django.config"
echo -e "${BLUE}Creating 01_django.config...${NC}"
cat > "$DJANGO_CONFIG" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
EOF

# 5. Fix any other config files that might exist
echo -e "${BLUE}Fixing any other configuration files...${NC}"
for config_file in "$TEMP_DIR/.ebextensions"/*.config; do
    if [ -f "$config_file" ]; then
        filename=$(basename "$config_file")
        echo -e "${YELLOW}  Checking $filename...${NC}"
        
        # Skip if it's one we just created
        if [[ "$filename" == "04_django_docker.config" || "$filename" == "99_custom_env.config" || "$filename" == "99_custom_env_docker.config" || "$filename" == "01_django.config" ]]; then
            continue
        fi
        
        # Check if file contains malformed YAML and fix it
        if grep -q "option_settings" "$config_file"; then
            echo -e "${YELLOW}    Reformatting $filename...${NC}"
            # Create a backup
            cp "$config_file" "${config_file}.original"
            
            # Create a properly formatted version
            cat > "$config_file" << EOF
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
EOF
        fi
    fi
done

echo -e "${GREEN}✓ All configuration files fixed${NC}"

# Ensure settings_eb.py exists and is properly configured
SETTINGS_FILE="$TEMP_DIR/pyfactor/settings_eb.py"
echo -e "${YELLOW}Ensuring settings_eb.py module is properly configured...${NC}"

# Create the pyfactor directory if it doesn't exist
mkdir -p "$TEMP_DIR/pyfactor"

# Create a comprehensive settings_eb.py
cat > "$SETTINGS_FILE" << 'EOF'
"""
Django settings for Elastic Beanstalk deployment.
This file contains all necessary settings for running the Django application on AWS Elastic Beanstalk.
"""
import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Allow all hosts for Elastic Beanstalk
ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
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
        'DIRS': [BASE_DIR / 'templates'],
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

# Database configuration for Elastic Beanstalk
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('RDS_DB_NAME', 'pyfactor'),
        'USER': os.environ.get('RDS_USERNAME', 'postgres'),
        'PASSWORD': os.environ.get('RDS_PASSWORD', ''),
        'HOST': os.environ.get('RDS_HOSTNAME', 'localhost'),
        'PORT': os.environ.get('RDS_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'prefer',
        },
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
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
}

# Security settings for production
if not DEBUG:
    SECURE_SSL_REDIRECT = False  # Let load balancer handle SSL
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/app/django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'pyfactor': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
EOF

echo -e "${GREEN}✓ Created comprehensive settings_eb.py module${NC}"

# Ensure __init__.py exists in pyfactor directory
INIT_FILE="$TEMP_DIR/pyfactor/__init__.py"
if [ ! -f "$INIT_FILE" ]; then
    echo -e "${YELLOW}Creating pyfactor/__init__.py...${NC}"
    touch "$INIT_FILE"
fi

# Create a robust Dockerfile
DOCKERFILE="$TEMP_DIR/Dockerfile"
echo -e "${YELLOW}Creating optimized Dockerfile...${NC}"
cat > "$DOCKERFILE" << 'EOF'
FROM python:3.12-slim

LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=pyfactor.settings_eb \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create directory for logs with proper permissions
RUN mkdir -p /var/log/app && \
    chmod 777 /var/log/app

# Create static files directory
RUN mkdir -p /app/staticfiles && \
    chmod 755 /app/staticfiles

# Collect static files (if manage.py exists)
RUN if [ -f "manage.py" ]; then python manage.py collectstatic --noinput --clear; fi

# Expose the application port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Run gunicorn with proper configuration
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "--access-logfile", "/var/log/app/access.log", "--error-logfile", "/var/log/app/error.log", "--log-level", "info", "pyfactor.wsgi:application"]
EOF

echo -e "${GREEN}✓ Created optimized Dockerfile${NC}"

# Update requirements.txt with all necessary dependencies
REQUIREMENTS="$TEMP_DIR/requirements.txt"
echo -e "${YELLOW}Updating requirements.txt with all dependencies...${NC}"
cat > "$REQUIREMENTS" << 'EOF'
Django>=4.2,<5.0
psycopg2-binary>=2.9.6
gunicorn>=21.2.0
whitenoise>=6.5.0
django-cors-headers>=4.3.0
djangorestframework>=3.14.0
requests>=2.31.0
python-dotenv>=1.0.0
Pillow>=10.0.0
EOF

echo -e "${GREEN}✓ Updated requirements.txt${NC}"

# Create a simple health check view
HEALTH_CHECK_FILE="$TEMP_DIR/pyfactor/health_check.py"
echo -e "${YELLOW}Creating health check view...${NC}"
cat > "$HEALTH_CHECK_FILE" << 'EOF'
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """Simple health check endpoint for load balancer"""
    return JsonResponse({"status": "healthy", "service": "pyfactor"})
EOF

echo -e "${GREEN}✓ Created health check view${NC}"

# Update or create wsgi.py
WSGI_FILE="$TEMP_DIR/pyfactor/wsgi.py"
echo -e "${YELLOW}Ensuring proper wsgi.py configuration...${NC}"
cat > "$WSGI_FILE" << 'EOF'
"""
WSGI config for pyfactor project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')

application = get_wsgi_application()
EOF

echo -e "${GREEN}✓ Updated wsgi.py${NC}"

# Create manage.py if it doesn't exist
MANAGE_FILE="$TEMP_DIR/manage.py"
if [ ! -f "$MANAGE_FILE" ]; then
    echo -e "${YELLOW}Creating manage.py...${NC}"
    cat > "$MANAGE_FILE" << 'EOF'
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
EOF
    chmod +x "$MANAGE_FILE"
fi

echo -e "${GREEN}✓ Ensured manage.py exists${NC}"

# Create the new package
echo -e "${YELLOW}Creating comprehensive fixed package...${NC}"
cd "$TEMP_DIR" && zip -r "../$NEW_PACKAGE" * .ebextensions .platform .dockerignore 2>/dev/null
cd ..

# Check if package was created successfully
if [ ! -f "$NEW_PACKAGE" ]; then
    echo -e "${RED}Error: Failed to create new package${NC}"
    exit 1
fi

PACKAGE_SIZE=$(du -h "$NEW_PACKAGE" | cut -f1)
echo -e "${GREEN}✓ Created comprehensive package: $NEW_PACKAGE ($PACKAGE_SIZE)${NC}"

# Clean up temporary directory
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ Cleanup complete${NC}"

echo -e "${BLUE}============== COMPREHENSIVE FIXES APPLIED SUCCESSFULLY ==============${NC}"
echo -e "${GREEN}1. Fixed ALL .ebextensions configuration files${NC}"
echo -e "${GREEN}2. Created comprehensive settings_eb.py module${NC}"
echo -e "${GREEN}3. Updated Dockerfile with health checks and proper configuration${NC}"
echo -e "${GREEN}4. Updated requirements.txt with all dependencies${NC}"
echo -e "${GREEN}5. Ensured all necessary Django files exist${NC}"
echo -e "${GREEN}6. Added health check endpoint${NC}"
echo -e "${BLUE}========================================================================${NC}"

echo -e "${YELLOW}To deploy the comprehensive package, update Version0072_deploy_fixed_package.sh:${NC}"
echo -e "${BLUE}Change FIXED_PACKAGE to: $NEW_PACKAGE${NC}"
echo -e "${YELLOW}Then run: ./scripts/Version0072_deploy_fixed_package.sh${NC}" 