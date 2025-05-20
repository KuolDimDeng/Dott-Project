#!/bin/bash
# create_optimized_docker_package.sh - Creates an optimized Docker deployment package for AWS Elastic Beanstalk
# Version: 1.0.0
# Updated: May 19, 2025

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Set variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
PACKAGE_NAME="optimized-docker-eb-package-${TIMESTAMP}.zip"
TEMP_DIR="${BASE_DIR}/docker_optimized_temp"

# Print header
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  Creating Optimized Docker Package    ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check if temp directory exists and remove it
if [ -d "$TEMP_DIR" ]; then
    echo -e "${YELLOW}Removing existing temporary directory...${NC}"
    rm -rf "$TEMP_DIR"
fi

# Create temp directory
echo -e "${BLUE}Creating temporary directory...${NC}"
mkdir -p "$TEMP_DIR"
mkdir -p "$TEMP_DIR/.ebextensions"

# Copy optimized Dockerfile with setuptools fix
echo -e "${BLUE}Adding optimized Dockerfile...${NC}"
cat > "$TEMP_DIR/Dockerfile" << 'EOF'
FROM python:3.12-slim

LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings
ENV PORT=8000

# Set working directory
WORKDIR /app

# Install setuptools first to fix build issues
RUN pip install --no-cache-dir setuptools wheel

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements-eb.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-eb.txt

# Copy project files
COPY . .

# Create a non-root user to run the application
RUN adduser --disabled-password --gecos "" appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose the application port
EXPOSE 8000

# Set entry point
CMD gunicorn pyfactor.wsgi:application --bind 0.0.0.0:$PORT
EOF

# Create Dockerrun.aws.json
echo -e "${BLUE}Creating Dockerrun.aws.json...${NC}"
cat > "$TEMP_DIR/Dockerrun.aws.json" << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Ports": [
    {
      "ContainerPort": 8000,
      "HostPort": 8000
    }
  ],
  "Logging": "/var/log/app"
}
EOF

# Create requirements-eb.txt with production dependencies only
echo -e "${BLUE}Creating optimized requirements file...${NC}"
cat > "$TEMP_DIR/requirements-eb.txt" << 'EOF'
Django>=4.2.10,<5.0
djangorestframework>=3.14.0,<4.0
gunicorn>=21.2.0,<22.0
psycopg2-binary>=2.9.9,<3.0
django-cors-headers>=4.3.1,<5.0
django-filter>=23.5,<24.0
whitenoise>=6.6.0,<7.0
requests>=2.31.0,<3.0
python-dotenv>=1.0.0,<2.0
dj-database-url>=2.1.0,<3.0
sentry-sdk>=1.39.1,<2.0
EOF

# Create .ebextensions configuration
echo -e "${BLUE}Adding .ebextensions configuration...${NC}"
cat > "$TEMP_DIR/.ebextensions/01_django.config" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings
    PYTHONPATH: /app
    PORT: 8000
EOF

cat > "$TEMP_DIR/.ebextensions/02_health.config" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /health/
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    Port: 8000
    Protocol: HTTP
EOF

# Create health check app
echo -e "${BLUE}Creating health check app...${NC}"
mkdir -p "$TEMP_DIR/health"
touch "$TEMP_DIR/health/__init__.py"

cat > "$TEMP_DIR/health/views.py" << 'EOF'
from django.http import JsonResponse
from django.db import connections
from django.db.utils import OperationalError

def health_check(request):
    """
    Health check view for AWS Elastic Beanstalk.
    Checks database connection and returns health status.
    """
    is_database_working = True
    
    # Check database connections
    try:
        db_conn = connections['default']
        db_conn.cursor()
    except OperationalError:
        is_database_working = False
    
    status = 200 if is_database_working else 503
    
    # Response data
    data = {
        'status': 'ok' if is_database_working else 'error',
        'message': 'Health check passed' if is_database_working else 'Database connection error',
        'database': is_database_working,
    }
    
    return JsonResponse(data, status=status)
EOF

cat > "$TEMP_DIR/health/urls.py" << 'EOF'
from django.urls import path
from .views import health_check

urlpatterns = [
    path('', health_check, name='health_check'),
]
EOF

# Create main app URLs and wsgi.py
echo -e "${BLUE}Creating main application structure...${NC}"
mkdir -p "$TEMP_DIR/pyfactor"
touch "$TEMP_DIR/pyfactor/__init__.py"

cat > "$TEMP_DIR/pyfactor/urls.py" << 'EOF'
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', include('health.urls')),
]
EOF

cat > "$TEMP_DIR/pyfactor/wsgi.py" << 'EOF'
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
application = get_wsgi_application()
EOF

cat > "$TEMP_DIR/pyfactor/settings.py" << 'EOF'
import os
import dj_database_url
from pathlib import Path

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-1234567890')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'health',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
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
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///db.sqlite3')
DATABASES = {
    'default': dj_database_url.parse(DATABASE_URL)
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
}
EOF

# Add .ebignore to exclude unnecessary files
echo -e "${BLUE}Adding .ebignore file...${NC}"
cat > "$TEMP_DIR/.ebignore" << 'EOF'
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.env
.env.*
env/
venv/
ENV/
*.sqlite3
.git/
.gitignore
.idea/
.vscode/
node_modules/
*.log
*.pot
*.pyc
.DS_Store
EOF

# Create the deployment package
echo -e "${BLUE}Creating deployment package...${NC}"
cd "$TEMP_DIR"
zip -r "$BASE_DIR/$PACKAGE_NAME" . -x "*.git*" "*.DS_Store" "*.pyc" "__pycache__/*" "*.zip"

if [ $? -ne 0 ]; then
    echo -e "${RED}Error creating deployment package.${NC}"
    exit 1
fi

# Clean up
echo -e "${BLUE}Cleaning up temporary files...${NC}"
cd "$BASE_DIR"
rm -rf "$TEMP_DIR"

# Check package size
PACKAGE_SIZE=$(du -h "$BASE_DIR/$PACKAGE_NAME" | cut -f1)
echo -e "${GREEN}Successfully created optimized Docker package: ${PACKAGE_NAME}${NC}"
echo -e "${BLUE}Package size: ${PACKAGE_SIZE}${NC}"

# Echo the package name (to be captured by the deployment script)
echo "$PACKAGE_NAME"

exit 0
