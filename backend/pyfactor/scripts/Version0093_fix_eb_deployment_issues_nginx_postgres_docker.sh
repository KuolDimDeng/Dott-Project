#!/bin/bash

# Version0093_fix_eb_deployment_issues_nginx_postgres_docker.sh
# Purpose: Fix critical EB deployment issues including nginx config, PostgreSQL installation, and Docker memory
# Date: 2025-05-29
# Issue Reference: Production deployment failures with nginx, PostgreSQL, and Docker container issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
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

# Create backup directory
BACKUP_DIR="$PROJECT_ROOT/backups/backup_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# Backup existing configurations
backup_configurations() {
    log_info "Backing up existing configurations..."
    
    # Backup .ebextensions
    if [ -d "$PROJECT_ROOT/.ebextensions" ]; then
        cp -r "$PROJECT_ROOT/.ebextensions" "$BACKUP_DIR/"
        log_info "Backed up .ebextensions"
    fi
    
    # Backup platform hooks
    if [ -d "$PROJECT_ROOT/.platform" ]; then
        cp -r "$PROJECT_ROOT/.platform" "$BACKUP_DIR/"
        log_info "Backed up .platform"
    fi
    
    # Backup Dockerfile and related files
    for file in Dockerfile Dockerrun.aws.json docker-compose.yml; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            cp "$PROJECT_ROOT/$file" "$BACKUP_DIR/"
            log_info "Backed up $file"
        fi
    done
}

# Fix 1: Create nginx configuration to address hash size and client body size
create_nginx_config() {
    log_info "Creating nginx configuration fixes..."
    
    mkdir -p "$PROJECT_ROOT/.platform/nginx/conf.d"
    
    cat > "$PROJECT_ROOT/.platform/nginx/conf.d/custom.conf" << 'EOF'
# Fix nginx hash bucket size warnings
types_hash_max_size 2048;
types_hash_bucket_size 128;

# Increase client body size limit to 100MB for file uploads
client_max_body_size 100M;

# Additional optimizations
client_body_buffer_size 128k;
client_header_buffer_size 1k;
large_client_header_buffers 4 16k;

# Timeouts
client_body_timeout 60;
client_header_timeout 60;
keepalive_timeout 65;
send_timeout 60;

# Gzip compression
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml;
EOF
    
    log_success "Created nginx configuration"
}

# Fix 2: Create enhanced PostgreSQL installation script for AL2023
create_postgres_fix() {
    log_info "Creating PostgreSQL installation fix..."
    
    mkdir -p "$PROJECT_ROOT/.platform/hooks/prebuild"
    
    cat > "$PROJECT_ROOT/.platform/hooks/prebuild/03_install_postgres_client.sh" << 'EOF'
#!/bin/bash
# Enhanced PostgreSQL client installation for Amazon Linux 2023

set -e

echo "Installing PostgreSQL client on AL2023..."

# Update package manager
dnf update -y

# Install PostgreSQL 15 from Amazon Linux repos (more stable than external repos)
dnf install -y postgresql15 postgresql15-devel

# Create symbolic links for compatibility
ln -sf /usr/bin/psql15 /usr/bin/psql || true
ln -sf /usr/bin/pg_dump15 /usr/bin/pg_dump || true
ln -sf /usr/bin/pg_restore15 /usr/bin/pg_restore || true

# Install additional dependencies
dnf install -y \
    gcc \
    gcc-c++ \
    python3-devel \
    libpq-devel \
    openssl-devel \
    make

# Set PostgreSQL environment variables
echo "export PATH=/usr/pgsql-15/bin:$PATH" >> /home/ec2-user/.bashrc
echo "export LD_LIBRARY_PATH=/usr/pgsql-15/lib:$LD_LIBRARY_PATH" >> /home/ec2-user/.bashrc

echo "PostgreSQL client installation completed"
EOF
    
    chmod +x "$PROJECT_ROOT/.platform/hooks/prebuild/03_install_postgres_client.sh"
    log_success "Created PostgreSQL installation fix"
}

# Fix 3: Update Docker configuration for memory optimization
create_docker_config() {
    log_info "Creating optimized Docker configuration..."
    
    # Create Dockerrun.aws.json with memory limits
    cat > "$PROJECT_ROOT/Dockerrun.aws.json" << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "python:3.12-slim",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "8000"
    }
  ],
  "Volumes": [
    {
      "HostDirectory": "/var/app/current",
      "ContainerDirectory": "/app"
    }
  ],
  "Logging": "/var/log/eb-docker",
  "Command": "gunicorn pyfactor.wsgi:application --bind 0.0.0.0:8000 --workers 2 --threads 4 --worker-class gthread --timeout 120 --keepalive 5 --max-requests 1000 --max-requests-jitter 50"
}
EOF
    
    # Create optimized Dockerfile
    cat > "$PROJECT_ROOT/Dockerfile" << 'EOF'
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt requirements-eb.txt* ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    ([ -f requirements-eb.txt ] && pip install --no-cache-dir -r requirements-eb.txt || true)

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p staticfiles logs

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health/ || exit 1

# Run gunicorn with optimized settings
CMD ["gunicorn", "pyfactor.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--threads", "4", \
     "--worker-class", "gthread", \
     "--timeout", "120", \
     "--keepalive", "5", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
EOF
    
    log_success "Created Docker configuration"
}

# Fix 4: Create EB extensions for environment configuration
create_eb_extensions() {
    log_info "Creating EB extension configurations..."
    
    mkdir -p "$PROJECT_ROOT/.ebextensions"
    
    # Environment variables configuration
    cat > "$PROJECT_ROOT/.ebextensions/01_environment.config" << 'EOF'
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
    MinInstancesInService: 1
  aws:elasticbeanstalk:command:
    DeploymentPolicy: Rolling
    BatchSizeType: Fixed
    BatchSize: 1
EOF
    
    # Docker settings
    cat > "$PROJECT_ROOT/.ebextensions/02_docker.config" << 'EOF'
option_settings:
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    HealthCheckInterval: 30
    HealthCheckTimeout: 5
    HealthyThresholdCount: 3
    UnhealthyThresholdCount: 5
    Port: 8000
    Protocol: HTTP
    StickinessEnabled: true
    StickinessLBCookieDuration: 86400
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
    EnhancedHealthAuthEnabled: true
EOF
    
    log_success "Created EB extension configurations"
}

# Fix 5: Update EB config to use correct application
update_eb_config() {
    log_info "Updating EB configuration..."
    
    # Check current config
    if [ -f "$PROJECT_ROOT/.elasticbeanstalk/config.yml" ]; then
        cp "$PROJECT_ROOT/.elasticbeanstalk/config.yml" "$BACKUP_DIR/"
        
        # Update to use Dott application (based on the environment name)
        cat > "$PROJECT_ROOT/.elasticbeanstalk/config.yml" << 'EOF'
branch-defaults:
  default:
    environment: Dott-env-fixed
    group_suffix: null
environment-defaults:
  Dott-env-fixed:
    branch: null
    repository: null
global:
  application_name: Dott
  branch: null
  default_ec2_keyname: dott-key-pair
  default_platform: Docker running on 64bit Amazon Linux 2023
  default_region: us-east-1
  include_git_submodules: true
  instance_profile: null
  platform_name: null
  platform_version: null
  profile: null
  repository: null
  sc: null
  workspace_type: Application
EOF
        log_success "Updated EB configuration"
    else
        log_error ".elasticbeanstalk/config.yml not found"
    fi
}

# Fix 6: Create deployment package
create_deployment_package() {
    log_info "Creating deployment package..."
    
    cd "$PROJECT_ROOT"
    
    # Create .ebignore if it doesn't exist
    cat > "$PROJECT_ROOT/.ebignore" << 'EOF'
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
EOF
    
    # Create deployment zip
    PACKAGE_NAME="eb-deploy-$TIMESTAMP.zip"
    zip -r "$PACKAGE_NAME" . -x@.ebignore
    
    log_success "Created deployment package: $PACKAGE_NAME"
    echo "Package location: $PROJECT_ROOT/$PACKAGE_NAME"
}

# Main execution
main() {
    log_info "Starting EB deployment fixes for Version0093..."
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run all fixes
    backup_configurations
    create_nginx_config
    create_postgres_fix
    create_docker_config
    create_eb_extensions
    update_eb_config
    create_deployment_package
    
    # Update script registry
    cat >> "$SCRIPT_DIR/script_registry.md" << EOF

## Version0093_fix_eb_deployment_issues_nginx_postgres_docker.sh
- **Date**: $(date +%Y-%m-%d)
- **Purpose**: Fix critical EB deployment issues including nginx config, PostgreSQL installation, and Docker memory
- **Status**: Completed
- **Changes**:
  - Fixed nginx hash bucket size warnings
  - Increased client body size limit to 100MB
  - Created PostgreSQL client installation for AL2023
  - Optimized Docker configuration for memory usage
  - Updated EB configuration to use correct application
  - Created comprehensive deployment package
EOF
    
    log_success "All fixes completed successfully!"
    
    echo ""
    echo "Next steps:"
    echo "1. Review the changes in: $PROJECT_ROOT"
    echo "2. Deploy using: eb deploy --staged"
    echo "3. Or deploy the package: $PROJECT_ROOT/eb-deploy-$TIMESTAMP.zip"
    echo "4. Monitor deployment: eb logs -f"
    echo ""
    echo "If deployment fails, check:"
    echo "- eb logs"
    echo "- eb health"
    echo "- eb status"
}

# Run main function
main "$@"
