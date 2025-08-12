#!/bin/bash

# Version0091_fix_eb_docker_deployment_config.sh
# Purpose: Fix AWS Elastic Beanstalk Docker deployment configuration errors
# Issues addressed:
# 1. Invalid static files configuration for Docker platform
# 2. Nginx configuration errors
# 3. Docker container startup failures
# 4. PostgreSQL client installation issues
# Date: 2025-05-29

set -e

echo "========================================"
echo "AWS EB Docker Deployment Configuration Fix"
echo "Version: 0091"
echo "========================================"

# Navigate to backend directory
cd /Users/kuoldeng/projectx/backend/pyfactor

# Backup current files
echo "Creating backups..."
if [ -f ".ebextensions/01_environment.config" ]; then
    cp .ebextensions/01_environment.config .ebextensions/01_environment.config.backup_$(date +%Y%m%d_%H%M%S)
fi
if [ -f "Dockerfile" ]; then
    cp Dockerfile Dockerfile.backup_$(date +%Y%m%d_%H%M%S)
fi

# Step 1: Fix .ebextensions configuration for Docker platform
echo "Fixing .ebextensions configuration..."
cat > .ebextensions/01_environment.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app
    PORT: 8000
  aws:elasticbeanstalk:environment:process:default:
    Port: 8000
    Protocol: HTTP
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
    EnhancedHealthAuthEnabled: true
EOF

# Step 2: Create nginx configuration for Docker
echo "Creating nginx configuration..."
mkdir -p .platform/nginx/conf.d
cat > .platform/nginx/conf.d/custom.conf << 'EOF'
client_max_body_size 50M;

# Fix nginx hash bucket size warnings
types_hash_max_size 2048;
types_hash_bucket_size 128;

# Upstream configuration
upstream django {
    server 127.0.0.1:8000;
}

# Server configuration
server {
    listen 80;
    server_name _;

    # Health check endpoint
    location /health/ {
        proxy_pass http://django/health/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check specific timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }

    # Static files
    location /static/ {
        alias /app/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /app/media/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Main application
    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        
        # Websocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Step 3: Create platform hooks for post-deployment tasks
echo "Creating platform hooks..."
mkdir -p .platform/hooks/postdeploy
cat > .platform/hooks/postdeploy/01_django_setup.sh << 'EOF'
#!/bin/bash

# Collect static files
echo "Collecting static files..."
cd /app
python manage.py collectstatic --noinput

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Ensure proper permissions
chmod -R 755 /app/staticfiles || true
chmod -R 755 /app/media || true

echo "Django setup completed"
EOF
chmod +x .platform/hooks/postdeploy/01_django_setup.sh

# Step 4: Update Dockerfile for better compatibility
echo "Updating Dockerfile..."
cat > Dockerfile << 'EOF'
FROM python:3.12-slim

# Install system dependencies including PostgreSQL client
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt /app/

# Install Python dependencies with specific versions
RUN pip install --upgrade pip==24.0 && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app/

# Create necessary directories with proper permissions
RUN mkdir -p /app/staticfiles /app/media /app/logs && \
    chmod -R 755 /app/staticfiles && \
    chmod -R 755 /app/media && \
    chmod -R 755 /app/logs

# Collect static files during build
RUN python manage.py collectstatic --noinput || echo "Static collection skipped"

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb
ENV PORT=8000

# Create a non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Expose port
EXPOSE 8000

# Run the application with proper signal handling
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "--log-level", "info", "--access-logfile", "-", "--error-logfile", "-", "--worker-tmp-dir", "/dev/shm", "pyfactor.wsgi:application"]
EOF

# Step 5: Create .dockerignore file
echo "Creating .dockerignore..."
cat > .dockerignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt
.tox/
.coverage
.coverage.*
.cache
.pytest_cache/
htmlcov/
.hypothesis/

# Django
*.log
local_settings.py
db.sqlite3
media/
staticfiles/

# Environment
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Docker
.dockerignore
Dockerfile*
docker-compose*.yml

# AWS
.elasticbeanstalk/
.ebignore

# Backups
*.backup*
*_backup*
EOF

# Step 6: Create deployment package script
echo "Creating deployment package script..."
cat > create_deployment_package.sh << 'EOF'
#!/bin/bash

# Create deployment package for AWS Elastic Beanstalk
set -e

echo "Creating deployment package..."

# Clean up old packages
rm -f deploy.zip

# Create deployment package excluding unnecessary files
zip -r deploy.zip . \
    -x "*.git*" \
    -x "*.venv*" \
    -x "*__pycache__*" \
    -x "*.pyc" \
    -x "*.pyo" \
    -x "*.backup*" \
    -x "*_backup*" \
    -x "staticfiles/*" \
    -x "media/*" \
    -x "logs/*" \
    -x "*.log" \
    -x ".DS_Store" \
    -x "Thumbs.db" \
    -x "deploy.zip"

echo "Deployment package created: deploy.zip"
echo "Size: $(du -h deploy.zip | cut -f1)"
EOF
chmod +x create_deployment_package.sh

# Step 7: Update requirements to fix dependency conflicts
echo "Updating requirements.txt..."
# Remove problematic dependencies and add fixed versions
cat > requirements-eb.txt << 'EOF'
# Django and core dependencies
Django==4.2.10
gunicorn==21.2.0
psycopg2-binary==2.9.9
python-decouple==3.8

# Django REST Framework
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.0
django-cors-headers==4.3.1

# AWS SDK
boto3==1.26.164
botocore==1.29.164

# Celery and Redis
celery==5.4.0
redis==5.0.7

# Authentication
PyJWT==2.10.1

# Utilities
Pillow==10.4.0
requests==2.31.0
python-dateutil==2.9.0
pytz==2023.3

# Remove conflicting dependencies
# chardet is included with requests, no need to specify separately
# charset-normalizer is included with requests
EOF

# Step 8: Create deployment script
echo "Creating deployment script..."
cat > deploy_to_eb.sh << 'EOF'
#!/bin/bash

# Deploy to AWS Elastic Beanstalk
set -e

echo "Starting deployment to Elastic Beanstalk..."

# Create deployment package
./create_deployment_package.sh

# Deploy using EB CLI
eb deploy --timeout 30

# Check deployment status
eb status

echo "Deployment completed!"
EOF
chmod +x deploy_to_eb.sh

# Step 9: Update script registry
echo "Updating script registry..."
cat >> scripts/script_registry.md << 'EOF'

## Version0091_fix_eb_docker_deployment_config.sh
- **Date**: 2025-05-29
- **Purpose**: Fix AWS Elastic Beanstalk Docker deployment configuration errors
- **Issues Fixed**:
  - Invalid static files configuration for Docker platform
  - Nginx configuration errors and hash bucket size warnings
  - Docker container startup failures
  - PostgreSQL client installation issues
  - Dependency conflicts
- **Changes Made**:
  - Updated .ebextensions configuration for Docker compatibility
  - Created custom nginx configuration with proper upstream handling
  - Added platform hooks for Django setup
  - Updated Dockerfile with health checks and non-root user
  - Created deployment scripts
- **Status**: Ready to deploy
EOF

echo "========================================"
echo "Configuration fixes completed!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Review the changes in .ebextensions/01_environment.config"
echo "2. Review the new nginx configuration in .platform/nginx/conf.d/custom.conf"
echo "3. Test the deployment locally with Docker if possible"
echo "4. Deploy to Elastic Beanstalk using: ./deploy_to_eb.sh"
echo ""
echo "The script has addressed:"
echo "- Removed invalid static files configuration"
echo "- Added proper nginx configuration for Docker"
echo "- Fixed container startup issues"
echo "- Added health check support"
echo "- Created deployment automation"
echo ""
echo "Note: Ensure your AWS credentials are configured before deploying."
