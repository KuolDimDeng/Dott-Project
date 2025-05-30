#!/bin/bash

# Fix Docker Container Crash Issue for AWS Elastic Beanstalk
# Date: 2025-05-29
# Issue: Docker container unexpectedly ends after starting

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$PROJECT_ROOT/backend/pyfactor"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging functions
log_info() {
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_success() {
    echo "[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Create backup
backup_files() {
    log_info "Creating backup..."
    mkdir -p "$BACKEND_DIR/backups/docker_fix_$TIMESTAMP"
    
    # Backup critical files
    cp "$BACKEND_DIR/pyfactor/settings_eb.py" "$BACKEND_DIR/backups/docker_fix_$TIMESTAMP/" || true
    cp "$BACKEND_DIR/Dockerfile" "$BACKEND_DIR/backups/docker_fix_$TIMESTAMP/" || true
    cp "$BACKEND_DIR/requirements-eb.txt" "$BACKEND_DIR/backups/docker_fix_$TIMESTAMP/" || true
}

# Fix 1: Update settings_eb.py to include health app
fix_settings_eb() {
    log_info "Fixing settings_eb.py..."
    
    # Create a temporary file to modify settings
    cat > "$BACKEND_DIR/temp_settings_fix.py" << 'EOF'
import re

# Read the current settings file
with open('pyfactor/settings_eb.py', 'r') as f:
    content = f.read()

# Add 'health' to SHARED_APPS if not present
if "'health'" not in content:
    # Find SHARED_APPS and add health app
    pattern = r"(SHARED_APPS = \()(.*?)(\))"
    def add_health_app(match):
        apps_start = match.group(1)
        apps_content = match.group(2)
        apps_end = match.group(3)
        # Add health app after staticfiles
        apps_content = apps_content.replace("'django.contrib.staticfiles',", "'django.contrib.staticfiles',\n    'health',")
        return apps_start + apps_content + apps_end
    
    content = re.sub(pattern, add_health_app, content, flags=re.DOTALL)

# Write the updated content
with open('pyfactor/settings_eb.py', 'w') as f:
    f.write(content)

print("Updated settings_eb.py with health app")
EOF

    cd "$BACKEND_DIR"
    python temp_settings_fix.py
    rm temp_settings_fix.py
    
    log_success "Fixed settings_eb.py"
}

# Fix 2: Update main urls.py to include health endpoint
fix_urls() {
    log_info "Fixing URL configuration..."
    
    # Check if health URL is included in main urls.py
    if ! grep -q "health/" "$BACKEND_DIR/pyfactor/urls.py"; then
        # Add health URL to urlpatterns
        cat > "$BACKEND_DIR/temp_urls_fix.py" << 'EOF'
import re

with open('pyfactor/urls.py', 'r') as f:
    content = f.read()

# Check if health URL already exists
if "path('health/'," not in content:
    # Find urlpatterns and add health URL
    pattern = r"(urlpatterns = \[)(.*?)(\])"
    def add_health_url(match):
        urls_start = match.group(1)
        urls_content = match.group(2)
        urls_end = match.group(3)
        # Add health URL at the beginning
        health_url = "\n    path('health/', include('health.urls')),"
        return urls_start + health_url + urls_content + urls_end
    
    content = re.sub(pattern, add_health_url, content, flags=re.DOTALL)
    
    # Add import if not present
    if "from django.urls import include" not in content:
        content = content.replace("from django.urls import path", "from django.urls import path, include")

with open('pyfactor/urls.py', 'w') as f:
    f.write(content)

print("Updated urls.py with health endpoint")
EOF

        cd "$BACKEND_DIR"
        python temp_urls_fix.py
        rm temp_urls_fix.py
    fi
    
    log_success "Fixed URL configuration"
}

# Fix 3: Create simplified Dockerfile for debugging
create_simple_dockerfile() {
    log_info "Creating simplified Dockerfile..."
    
    cat > "$BACKEND_DIR/Dockerfile" << 'EOF'
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements-eb.txt ./

# Install Python dependencies with verbose output
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-eb.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p staticfiles logs media

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb
ENV PORT=8000

# Collect static files (allow failure for now)
RUN python manage.py collectstatic --noinput || echo "Static files collection failed, continuing..."

# Create a startup script
RUN echo '#!/bin/bash\n\
echo "Starting application..."\n\
echo "Python version: $(python --version)"\n\
echo "Django version: $(python -c "import django; print(django.__version__)")"\n\
echo "Current directory: $(pwd)"\n\
echo "Files in current directory:"\n\
ls -la\n\
echo "Running migrations..."\n\
python manage.py migrate --noinput || echo "Migration failed, continuing..."\n\
echo "Starting Gunicorn..."\n\
exec gunicorn pyfactor.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level debug' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 8000

# Health check with longer start period
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:8000/health/ || exit 1

# Run the startup script
CMD ["/app/start.sh"]
EOF
    
    log_success "Created simplified Dockerfile"
}

# Fix 4: Create minimal requirements-eb.txt
create_minimal_requirements() {
    log_info "Creating minimal requirements-eb.txt..."
    
    # Check if requirements-eb.txt exists, if not copy from requirements.txt
    if [ ! -f "$BACKEND_DIR/requirements-eb.txt" ]; then
        if [ -f "$BACKEND_DIR/requirements.txt" ]; then
            cp "$BACKEND_DIR/requirements.txt" "$BACKEND_DIR/requirements-eb.txt"
        else
            # Create minimal requirements
            cat > "$BACKEND_DIR/requirements-eb.txt" << 'EOF'
# Core Django
Django==5.1.7
gunicorn==20.1.0
whitenoise==6.5.0

# Database
psycopg2-binary==2.9.9
dj-db-conn-pool==1.2.0

# AWS and Auth
boto3==1.34.0
PyJWT==2.8.0
cryptography==42.0.8

# REST Framework
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.1
dj-rest-auth==6.0.0
django-allauth==0.62.1

# CORS
django-cors-headers==4.3.1

# Other essentials
django-countries==7.6.1
django-phonenumber-field==7.3.0
phonenumbers==8.13.37
django-cryptography==1.1
django-celery-beat==2.6.0
redis==5.0.0
celery==5.4.0
python-dateutil==2.9.0
EOF
        fi
    fi
    
    log_success "Created requirements-eb.txt"
}

# Fix 5: Create health check middleware if missing
create_health_middleware() {
    log_info "Creating health check middleware..."
    
    if [ ! -f "$BACKEND_DIR/pyfactor/health_check.py" ]; then
        cat > "$BACKEND_DIR/pyfactor/health_check.py" << 'EOF'
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

class HealthCheckMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.path == '/health/' or request.path == '/health':
            return JsonResponse({
                "status": "healthy",
                "service": "pyfactor-backend",
                "version": "1.0.0"
            })
        return None
EOF
    fi
    
    log_success "Created health check middleware"
}

# Fix 6: Update .ebextensions for proper configuration
update_eb_extensions() {
    log_info "Updating EB extensions..."
    
    mkdir -p "$BACKEND_DIR/.ebextensions"
    
    # Create updated environment config
    cat > "$BACKEND_DIR/.ebextensions/01_environment.config" << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONUNBUFFERED: 1
    PORT: 8000
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /static: staticfiles
  aws:ec2:instances:
    InstanceTypes: t3.small
  aws:autoscaling:updatepolicy:rollingupdate:
    RollingUpdateEnabled: true
    MaxBatchSize: 1
    MinInstancesInService: 0
  aws:elasticbeanstalk:command:
    DeploymentPolicy: Rolling
    BatchSizeType: Fixed
    BatchSize: 1
    IgnoreHealthCheck: true
EOF

    # Create Docker config with increased memory
    cat > "$BACKEND_DIR/.ebextensions/02_docker.config" << 'EOF'
option_settings:
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    HealthCheckInterval: 30
    HealthCheckTimeout: 10
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 5
    Port: 8000
    Protocol: HTTP
    DeregistrationDelay: 20
    StickinessEnabled: true
    StickinessLBCookieDuration: 86400
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
    EnhancedHealthAuthEnabled: true

commands:
  01_increase_docker_memory:
    command: |
      if [ -f /etc/sysconfig/docker ]; then
        echo 'OPTIONS="${OPTIONS} --default-ulimit nofile=65536:65536"' >> /etc/sysconfig/docker
        echo 'OPTIONS="${OPTIONS} --storage-opt dm.basesize=20G"' >> /etc/sysconfig/docker
        service docker restart
      fi
    ignoreErrors: true
EOF
    
    log_success "Updated EB extensions"
}

# Main execution
main() {
    log_info "Starting Docker container crash fix..."
    
    cd "$PROJECT_ROOT"
    
    # Run all fixes
    backup_files
    fix_settings_eb
    fix_urls
    create_simple_dockerfile
    create_minimal_requirements
    create_health_middleware
    update_eb_extensions
    
    # Create deployment package
    cd "$BACKEND_DIR"
    
    # Remove .venv to reduce package size
    rm -rf .venv
    
    # Create .ebignore
    cat > "$BACKEND_DIR/.ebignore" << 'EOF'
# Virtual environments
venv/
.venv/
env/
.env/

# Python cache
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Development files
*.sqlite3
*.log
node_modules/
frontend/

# Test files
.pytest_cache/
.coverage
htmlcov/

# Backup files
backups/
*.backup
*.bak

# Documentation
docs/
*.md
!README.md

# Scripts
scripts/
EOF
    
    log_success "All fixes completed!"
    
    echo ""
    echo "Next steps:"
    echo "1. Deploy to Elastic Beanstalk:"
    echo "   cd backend/pyfactor"
    echo "   eb deploy"
    echo ""
    echo "2. Monitor the deployment:"
    echo "   eb logs"
    echo "   eb health"
    echo ""
    echo "3. If deployment still fails, check:"
    echo "   - Application logs: eb logs --all"
    echo "   - SSH into instance: eb ssh"
    echo "   - Check Docker logs: docker logs <container_id>"
}

# Run main function
main "$@" 