#!/bin/bash

# Fix missing dependencies in requirements-eb.txt

echo "Adding potentially missing dependencies..."

# Backup current requirements
cp requirements-eb.txt requirements-eb.txt.backup

# Add missing dependencies
cat >> requirements-eb.txt << 'EOF'

# Missing barcode dependency
python-barcode==0.15.1

# Missing allauth dependencies
requests-oauthlib==1.3.1
oauthlib==3.2.2

# Additional celery dependencies
kombu==5.3.4
amqp==5.2.0
billiard==4.2.0
vine==5.1.0

# Django REST framework dependencies
pytz==2024.1
tzdata==2024.1

# Additional database dependencies
click==8.1.7
click-didyoumean==0.3.0
click-plugins==1.1.1
click-repl==0.3.0
prompt-toolkit==3.0.43
wcwidth==0.2.13

# Cryptography dependencies (ensure all are present)
pycryptodome==3.20.0
EOF

echo "Updated requirements-eb.txt with missing dependencies"

# Also update the Dockerfile to ensure all dependencies are installed
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
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install requirements with better error handling
COPY requirements-eb.txt ./
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements-eb.txt || \
    (echo "Failed to install requirements, retrying..." && \
     pip install --no-cache-dir --no-deps -r requirements-eb.txt)

# Copy all application files
COPY . .

# Create necessary directories
RUN mkdir -p staticfiles logs media

# Create startup script with better error handling
RUN cat > /app/start.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "=== Django Application Startup ==="
echo "Time: $(date)"
echo "Python: $(python --version)"

# Set environment variables
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-pyfactor.settings_eb}
export PYTHONUNBUFFERED=1

# Verify critical imports before starting
echo "Verifying imports..."
python -c "
import django
import gunicorn
import psycopg2
import whitenoise
import corsheaders
import rest_framework
import allauth
import celery
print('All critical imports successful!')
" || {
    echo "ERROR: Import verification failed!"
    exit 1
}

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

echo "Updated Dockerfile with better error handling"
echo ""
echo "Deploy with: eb deploy" 