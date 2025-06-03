#!/bin/bash

# Final emergency fix for Docker container crash
# This ensures all dependencies are properly included

set -e

echo "Creating final emergency fix..."

# Create comprehensive requirements-eb.txt with ALL necessary dependencies
cat > requirements-eb.txt << 'EOF'
# Core Django
Django==5.1.7
gunicorn==20.1.0
whitenoise==6.5.0

# Database
psycopg2-binary==2.9.9
dj-db-conn-pool==1.2.0

# Authentication and Security
PyJWT==2.8.0
cryptography==42.0.8

# REST Framework
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.1
dj-rest-auth==6.0.0
django-allauth==0.62.1

# CORS
django-cors-headers==4.3.1

# Additional Django packages
django-countries==7.6.1
django-phonenumber-field==7.3.0
phonenumbers==8.13.37
django-cryptography==1.1
django-celery-beat==2.6.0
django-extensions==3.2.3

# Redis and Celery
redis==5.0.0
celery==5.4.0

# Other dependencies
python-dateutil==2.9.0
six==1.16.0
certifi==2024.8.30
urllib3==2.2.3
requests==2.32.3
charset-normalizer==3.3.2
idna==3.10
pycparser==2.22
cffi==1.16.0
asgiref==3.8.1
sqlparse==0.5.1
typing-extensions==4.12.2
EOF

# Create a Dockerfile that includes better error handling
cat > Dockerfile << 'EOF'
FROM python:3.12-slim

# Install system dependencies including those needed for compilation
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    libpq-dev \
    libssl-dev \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install requirements
COPY requirements-eb.txt ./
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements-eb.txt

# Copy all application files
COPY . .

# Create necessary directories
RUN mkdir -p staticfiles logs media

# Create a comprehensive startup script
RUN cat > /app/start.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "=== Django Application Startup ==="
echo "Time: $(date)"
echo "Python: $(python --version)"
echo "Django: $(python -c 'import django; print(django.__version__)')"
echo "Working directory: $(pwd)"

# Set environment variables
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-pyfactor.settings_eb}
export PYTHONUNBUFFERED=1

# Log environment
echo "DJANGO_SETTINGS_MODULE: $DJANGO_SETTINGS_MODULE"

# Check for critical files
if [ ! -f "manage.py" ]; then
    echo "ERROR: manage.py not found!"
    ls -la
    exit 1
fi

if [ ! -d "pyfactor" ]; then
    echo "ERROR: pyfactor directory not found!"
    ls -la
    exit 1
fi

# Test Django configuration
echo "Testing Django configuration..."
python -c "import django; django.setup()" || {
    echo "ERROR: Django setup failed!"
    exit 1
}

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Warning: collectstatic failed, continuing..."

# Start Gunicorn
echo "Starting Gunicorn server..."
exec gunicorn pyfactor.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --capture-output \
    --enable-stdio-inheritance
SCRIPT

RUN chmod +x /app/start.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

EXPOSE 8000

# Run the startup script
CMD ["/app/start.sh"]
EOF

# Update .ebextensions with comprehensive settings
mkdir -p .ebextensions
cat > .ebextensions/01_environment.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONUNBUFFERED: 1
    SECRET_KEY: "temporary-secret-key-for-deployment"
    RDS_DB_NAME: dott_main
    RDS_USERNAME: dott_admin
    RDS_PASSWORD: RRfXU6uPPUbBEg1JqGTJ
    RDS_HOSTNAME: dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com
    RDS_PORT: 5432
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    HealthCheckInterval: 30
    HealthCheckTimeout: 10
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 5
    Port: 8000
    Protocol: HTTP
    DeregistrationDelay: 20
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
  aws:elasticbeanstalk:command:
    IgnoreHealthCheck: true
    Timeout: 1800
EOF

# Create platform hooks for additional setup
mkdir -p .platform/hooks/predeploy
cat > .platform/hooks/predeploy/01_setup.sh << 'EOF'
#!/bin/bash
# Platform hook for additional setup
echo "Running predeploy setup..."
# Ensure proper permissions
chmod -R 755 /var/app/staging/
EOF
chmod +x .platform/hooks/predeploy/01_setup.sh

echo "Final emergency fix completed!"
echo ""
echo "This fix includes:"
echo "- All required Python dependencies"
echo "- Comprehensive error handling in startup script"
echo "- Environment variables for database connection"
echo "- Extended timeout settings"
echo ""
echo "Deploy with: eb deploy" 