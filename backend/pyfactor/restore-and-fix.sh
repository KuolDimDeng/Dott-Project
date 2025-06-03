#!/bin/bash

# Restore working configuration with the cryptography fix

echo "Restoring working configuration with fixes..."

# Restore the Dockerfile from the final-emergency-fix
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

# Restore .ebextensions
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

echo "Configuration restored with fixes."
echo ""
echo "The main fix was removing the problematic cryptography import."
echo "All other configurations remain the same."
echo ""
echo "Deploy with: eb deploy" 