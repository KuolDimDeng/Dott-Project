#!/bin/bash
# create_minimal_package.sh - Creates a minimal Docker deployment package for EB
# This is a simplified version of reduce_package_size.sh for more reliability
# Updated by Version0034_fix_docker_package_structure.js to fix Docker package structure
# Paths fixed by Version0035_fix_directory_paths_in_minimal_package.js
# IMPORTANT: Dockerfile must be at the root of the ZIP file for EB to recognize it

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}======== MINIMAL PACKAGE CREATOR ========${NC}"

# Ensure Docker files and configuration are properly included
echo -e "${BLUE}Ensuring Docker files are properly structured...${NC}"
echo -e "${YELLOW}NOTE: Docker files must be at the root of the deployment package${NC}"

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
TIMESTAMP=$(date '+%Y%m%d%H%M%S')
OUTPUT_FILE="minimal-eb-package-$TIMESTAMP.zip"

# Create essential directories structure
mkdir -p "$TEMP_DIR/.platform/hooks/predeploy"
mkdir -p "$TEMP_DIR/.platform/hooks/postdeploy"
mkdir -p "$TEMP_DIR/.ebextensions"
mkdir -p "$TEMP_DIR/pyfactor"

echo -e "${BLUE}Creating minimal package structure...${NC}"

# Create essential Docker configuration files
# Add Dockerrun.aws.json as a failsafe
cat > "$TEMP_DIR/Dockerrun.aws.json" << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "dott-docker-image",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "8080",
      "HostPort": "8080"
    }
  ],
  "Logging": "/var/log/nginx"
}
EOF

cat > "$TEMP_DIR/Dockerfile" << 'EOF'
FROM python:3.10-slim

WORKDIR /var/app/current

# Install dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    git \
    wget \
    curl \
    zip \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy deployment files
COPY . /var/app/current

# Download the application code from S3
RUN mkdir -p /tmp/app_download && \
    cd /tmp/app_download && \
    echo "Downloading application code from S3..." && \
    # Install AWS CLI for S3 downloads
    pip install awscli && \
    # Configure AWS credentials with instance profile 
    echo "Using EC2 instance profile for AWS credentials" && \
    # Download from S3 
    aws s3 cp s3://dott-app-deployments-dockerebmanual001/full-app-code-20250517230538.zip . && \
    unzip full-app-code-20250517230538.zip -d /var/app/current && \
    echo "Application code downloaded and extracted successfully"

# Install requirements with retry mechanism
RUN pip install -r requirements-eb.txt --ignore-installed setuptools || \
    (echo "Retrying pip install..." && \
     pip install -r requirements-eb.txt --ignore-installed setuptools)

# Create directories for logs and data
RUN mkdir -p /var/app/current/logs /var/app/current/media /var/app/current/static

# Set environment variables
ENV PYTHONPATH=/var/app/current
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb
ENV DEBUG=False
ENV PORT=8080

# Expose port (EB uses port 8080)
EXPOSE 8080

# Command to run the app
CMD ["python", "manage.py", "runserver", "0.0.0.0:8080"]
EOF

# Create a minimal requirements file
cat > "$TEMP_DIR/requirements-eb.txt" << 'EOF'
Django>=4.1.0,<4.2.0
psycopg2-binary>=2.9.3
uwsgi>=2.0.20
EOF

# Create a minimal settings file
cat > "$TEMP_DIR/pyfactor/settings_eb.py" << 'EOF'
# Minimal settings for Elastic Beanstalk deployment
import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'temporary-secret-key-for-deployment')

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
        'NAME': os.environ.get('RDS_DB_NAME', 'pyfactor'),
        'USER': os.environ.get('RDS_USERNAME', 'postgres'),
        'PASSWORD': os.environ.get('RDS_PASSWORD', 'postgres'),
        'HOST': os.environ.get('RDS_HOSTNAME', 'localhost'),
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
USE_L10N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
EOF

# Create __init__.py files
touch "$TEMP_DIR/pyfactor/__init__.py"
touch "$TEMP_DIR/__init__.py"

# Create EB extensions config
cat > "$TEMP_DIR/.ebextensions/01_docker.config" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /var/app/current
    DEBUG: "False"
EOF

# Create predeploy hook
cat > "$TEMP_DIR/.platform/hooks/predeploy/01_setup.sh" << 'EOF'
#!/bin/bash
# Pre-deploy setup script
echo "Running pre-deploy setup..."
EOF
chmod +x "$TEMP_DIR/.platform/hooks/predeploy/01_setup.sh"

# Create postdeploy hook
cat > "$TEMP_DIR/.platform/hooks/postdeploy/01_migrate.sh" << 'EOF'
#!/bin/bash
# Post-deploy migration script
echo "Running post-deploy migrations..."
cd /var/app/current
python manage.py migrate --noinput
EOF
chmod +x "$TEMP_DIR/.platform/hooks/postdeploy/01_migrate.sh"

# Create minimal manage.py
cat > "$TEMP_DIR/manage.py" << 'EOF'
#!/usr/bin/env python
import os
import sys

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?"
        ) from exc
    execute_from_command_line(sys.argv)
EOF
chmod +x "$TEMP_DIR/manage.py"

# Create minimal urls.py
cat > "$TEMP_DIR/pyfactor/urls.py" << 'EOF'
from django.contrib import admin
from django.urls import path
from django.http import HttpResponse

def health_check(request):
    return HttpResponse("OK")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
]
EOF

# Create minimal wsgi.py
cat > "$TEMP_DIR/pyfactor/wsgi.py" << 'EOF'
import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')
application = get_wsgi_application()
EOF

# Add a README
cat > "$TEMP_DIR/README_MINIMAL_PACKAGE.md" << 'EOF'
# Minimal Deployment Package

This is a minimal Docker deployment package for Elastic Beanstalk. It contains only
the essential files needed to create a functional deployment that bypasses the 512MB
size limit.

Created with create_minimal_package.sh
EOF

# Create the zip file
echo -e "${BLUE}Creating minimal package...${NC}"
cd "$TEMP_DIR"
zip -rq "$TIMESTAMP-minimal-eb-package.zip" .

# Check if the package was created successfully
if [ ! -f "$TIMESTAMP-minimal-eb-package.zip" ]; then
  echo -e "${RED}Failed to create package in temp directory.${NC}"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Copy to project directory
cp "$TIMESTAMP-minimal-eb-package.zip" "/Users/kuoldeng/projectx/backend/pyfactor/"
if [ ! -f "/Users/kuoldeng/projectx/backend/pyfactor/$TIMESTAMP-minimal-eb-package.zip" ]; then
  echo -e "${RED}Failed to copy package to project directory.${NC}"
  rm -rf "$TEMP_DIR"
  exit 1
else
  echo -e "${GREEN}Package created successfully in backend/pyfactor directory.${NC}"
  OUTPUT_FILE="/Users/kuoldeng/projectx/backend/pyfactor/$TIMESTAMP-minimal-eb-package.zip"
fi

# Get the size of the package
PACKAGE_SIZE_MB=$(du -m "$OUTPUT_FILE" | cut -f1)
echo -e "${GREEN}Created minimal package: $OUTPUT_FILE (${PACKAGE_SIZE_MB} MB)${NC}"

# Copy to S3 if requested
echo -e "${YELLOW}To deploy this package using AWS CLI, run:${NC}"
echo -e "${BLUE}aws s3 cp $OUTPUT_FILE s3://dott-app-deployments-dockerebmanual001/${TIMESTAMP}-minimal-eb-package.zip${NC}"
echo -e "${BLUE}Then update the S3_KEY in aws_cli_deploy.sh to '${TIMESTAMP}-minimal-eb-package.zip'${NC}"

# Clean up temp dir
rm -rf "$TEMP_DIR"

echo -e "${GREEN}${BOLD}======== MINIMAL PACKAGE CREATED SUCCESSFULLY ========${NC}"
echo -e "${YELLOW}You can now upload this package to AWS Elastic Beanstalk.${NC}"
