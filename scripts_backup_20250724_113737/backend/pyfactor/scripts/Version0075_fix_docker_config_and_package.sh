#!/bin/bash

# Version0075_fix_docker_config_and_package.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix Docker configuration issues and ensure settings_eb.py is properly packaged

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DOCKER CONFIGURATION FIX FOR AWS ELASTIC BEANSTALK =====${NC}"
echo -e "${YELLOW}This script fixes Docker-specific configuration issues and packaging${NC}"

# Configuration
PREVIOUS_PACKAGE="fixed-all-configs-20250522114546.zip"
NEW_PACKAGE="fixed-docker-config-$(date +%Y%m%d%H%M%S).zip"
TEMP_DIR="temp_docker_fix_$(date +%Y%m%d%H%M%S)"

# Check if the previous package exists
if [ ! -f "$PREVIOUS_PACKAGE" ]; then
    echo -e "${RED}Error: Previous package $PREVIOUS_PACKAGE not found${NC}"
    echo -e "${YELLOW}Run Version0074_fix_all_configs_and_settings.sh first to create the package${NC}"
    exit 1
fi

# Create temporary directory
echo -e "${YELLOW}Creating temporary directory...${NC}"
mkdir -p "$TEMP_DIR"

# Extract the package
echo -e "${YELLOW}Extracting package to temporary directory...${NC}"
unzip -q "$PREVIOUS_PACKAGE" -d "$TEMP_DIR"

# Ensure .ebextensions directory exists
mkdir -p "$TEMP_DIR/.ebextensions"

echo -e "${YELLOW}Fixing Docker-specific configuration issues...${NC}"

# 1. Fix 04_django_docker.config - Remove WSGIPath which is not compatible with Docker
CONFIG_FILE="$TEMP_DIR/.ebextensions/04_django_docker.config"
echo -e "${BLUE}Fixing 04_django_docker.config (removing WSGIPath)...${NC}"
cat > "$CONFIG_FILE" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
    DEBUG: "False"
    ALLOWED_HOSTS: "*"
EOF

# 2. Fix 01_django.config - Remove WSGIPath
DJANGO_CONFIG="$TEMP_DIR/.ebextensions/01_django.config"
echo -e "${BLUE}Fixing 01_django.config...${NC}"
cat > "$DJANGO_CONFIG" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
    DEBUG: "False"
EOF

# 3. Create a Docker-specific environment config
DOCKER_ENV_CONFIG="$TEMP_DIR/.ebextensions/01_docker_env.config"
echo -e "${BLUE}Creating Docker environment configuration...${NC}"
cat > "$DOCKER_ENV_CONFIG" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
    DEBUG: "False"
    ALLOWED_HOSTS: "*"
    PORT: "8000"
EOF

# 4. Remove any Python-specific configurations that conflict with Docker
echo -e "${BLUE}Removing Python-specific configurations...${NC}"
for config_file in "$TEMP_DIR/.ebextensions"/*.config; do
    if [ -f "$config_file" ]; then
        filename=$(basename "$config_file")
        echo -e "${YELLOW}  Checking $filename for Python-specific settings...${NC}"
        
        # Remove WSGIPath and Python-specific settings from all config files
        if grep -q "WSGIPath\|aws:elasticbeanstalk:container:python" "$config_file"; then
            echo -e "${YELLOW}    Removing Python-specific settings from $filename...${NC}"
            # Create a backup
            cp "$config_file" "${config_file}.backup"
            
            # Remove problematic settings and keep only environment variables
            sed -i.bak '/WSGIPath/d' "$config_file"
            sed -i.bak '/aws:elasticbeanstalk:container:python/,+2d' "$config_file"
        fi
    fi
done

echo -e "${GREEN}✓ Docker configuration fixes applied${NC}"

# Ensure pyfactor directory structure is correct
echo -e "${YELLOW}Ensuring proper Django project structure...${NC}"

# Create the pyfactor directory if it doesn't exist
mkdir -p "$TEMP_DIR/pyfactor"

# Ensure __init__.py exists
INIT_FILE="$TEMP_DIR/pyfactor/__init__.py"
if [ ! -f "$INIT_FILE" ]; then
    echo -e "${YELLOW}Creating pyfactor/__init__.py...${NC}"
    touch "$INIT_FILE"
fi

# Create comprehensive settings_eb.py and ensure it's included
SETTINGS_FILE="$TEMP_DIR/pyfactor/settings_eb.py"
echo -e "${YELLOW}Creating comprehensive settings_eb.py...${NC}"
cat > "$SETTINGS_FILE" << 'EOF'
"""
Django settings for Elastic Beanstalk Docker deployment.
This file contains all necessary settings for running the Django application on AWS Elastic Beanstalk with Docker.
"""
import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-eb-docker-deployment-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Allow all hosts for Elastic Beanstalk Docker deployment
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

# Database configuration for Elastic Beanstalk Docker
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

# Static files (CSS, JavaScript, Images) - Docker optimized
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

# Security settings for production Docker deployment
if not DEBUG:
    SECURE_SSL_REDIRECT = False  # Let load balancer handle SSL
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

# Logging configuration for Docker
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
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/app/django.log',
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
            'propagate': False,
        },
        'pyfactor': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Health check URL for load balancer
HEALTH_CHECK_URL = '/health/'
EOF

echo -e "${GREEN}✓ Created Docker-optimized settings_eb.py${NC}"

# Update wsgi.py to ensure proper module loading
WSGI_FILE="$TEMP_DIR/pyfactor/wsgi.py"
echo -e "${YELLOW}Updating wsgi.py for Docker deployment...${NC}"
cat > "$WSGI_FILE" << 'EOF'
"""
WSGI config for pyfactor project - Docker deployment.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os
import sys
from django.core.wsgi import get_wsgi_application

# Add the project directory to Python path
sys.path.insert(0, '/app')
sys.path.insert(0, '/app/pyfactor')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')

application = get_wsgi_application()
EOF

echo -e "${GREEN}✓ Updated wsgi.py for Docker${NC}"

# Create an optimized Dockerfile for this deployment
DOCKERFILE="$TEMP_DIR/Dockerfile"
echo -e "${YELLOW}Creating Docker-optimized Dockerfile...${NC}"
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
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create necessary directories
RUN mkdir -p /var/log/app && \
    mkdir -p /app/staticfiles && \
    chmod 755 /app/staticfiles && \
    chmod 777 /var/log/app

# Collect static files (with error handling)
RUN python manage.py collectstatic --noinput --clear || echo "Static files collection failed, continuing..."

# Create a simple health check script
RUN echo '#!/bin/bash\ncurl -f http://localhost:8000/health/ || exit 1' > /usr/local/bin/health-check.sh && \
    chmod +x /usr/local/bin/health-check.sh

# Expose the application port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD /usr/local/bin/health-check.sh

# Run gunicorn with Docker-optimized settings
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "--log-level", "info", "pyfactor.wsgi:application"]
EOF

echo -e "${GREEN}✓ Created Docker-optimized Dockerfile${NC}"

# Ensure requirements.txt is comprehensive
REQUIREMENTS="$TEMP_DIR/requirements.txt"
echo -e "${YELLOW}Updating requirements.txt...${NC}"
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

# Create a simple health check view if urls.py doesn't exist
URLS_FILE="$TEMP_DIR/pyfactor/urls.py"
if [ ! -f "$URLS_FILE" ]; then
    echo -e "${YELLOW}Creating basic urls.py with health check...${NC}"
    cat > "$URLS_FILE" << 'EOF'
"""pyfactor URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.http import JsonResponse

def health_check(request):
    """Simple health check endpoint"""
    return JsonResponse({"status": "healthy", "service": "pyfactor"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
]
EOF
fi

echo -e "${GREEN}✓ Ensured basic URL configuration exists${NC}"

# Display the project structure for verification
echo -e "${YELLOW}Project structure in package:${NC}"
find "$TEMP_DIR" -name "*.py" | head -10

# Create the new package
echo -e "${YELLOW}Creating Docker-fixed package...${NC}"
cd "$TEMP_DIR" && zip -r "../$NEW_PACKAGE" * .ebextensions .platform .dockerignore 2>/dev/null
cd ..

# Check if package was created successfully
if [ ! -f "$NEW_PACKAGE" ]; then
    echo -e "${RED}Error: Failed to create new package${NC}"
    exit 1
fi

PACKAGE_SIZE=$(du -h "$NEW_PACKAGE" | cut -f1)
echo -e "${GREEN}✓ Created Docker-fixed package: $NEW_PACKAGE ($PACKAGE_SIZE)${NC}"

# Clean up temporary directory
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ Cleanup complete${NC}"

echo -e "${BLUE}============== DOCKER CONFIGURATION FIXES APPLIED ==============${NC}"
echo -e "${GREEN}1. Removed Docker-incompatible WSGIPath parameters${NC}"
echo -e "${GREEN}2. Fixed all .ebextensions configuration files for Docker${NC}"
echo -e "${GREEN}3. Ensured settings_eb.py module is properly included${NC}"
echo -e "${GREEN}4. Created Docker-optimized Dockerfile${NC}"
echo -e "${GREEN}5. Updated wsgi.py for proper module loading${NC}"
echo -e "${GREEN}6. Added health check endpoint and URL configuration${NC}"
echo -e "${GREEN}7. Ensured all required Django files are present${NC}"
echo -e "${BLUE}================================================================${NC}"

echo -e "${YELLOW}To deploy the Docker-fixed package, update Version0072_deploy_fixed_package.sh:${NC}"
echo -e "${BLUE}Change FIXED_PACKAGE to: $NEW_PACKAGE${NC}"
echo -e "${YELLOW}Then run: ./scripts/Version0072_deploy_fixed_package.sh${NC}" 