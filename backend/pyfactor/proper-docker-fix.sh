#!/bin/bash

# Proper Docker fix for Elastic Beanstalk
# This creates a working Docker configuration with debugging

set -e

echo "Creating proper Docker fix..."

# Backup current Dockerfile
cp Dockerfile Dockerfile.backup.$(date +%Y%m%d_%H%M%S) || true

# Create a new Dockerfile with debugging
cat > Dockerfile << 'EOF'
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# First, create and install a minimal requirements file
RUN echo "Django==5.1.7" > requirements-minimal.txt && \
    echo "gunicorn==20.1.0" >> requirements-minimal.txt && \
    echo "psycopg2-binary==2.9.9" >> requirements-minimal.txt && \
    echo "whitenoise==6.5.0" >> requirements-minimal.txt && \
    echo "django-cors-headers==4.3.1" >> requirements-minimal.txt && \
    echo "djangorestframework==3.14.0" >> requirements-minimal.txt && \
    echo "PyJWT==2.8.0" >> requirements-minimal.txt && \
    echo "dj-db-conn-pool==1.2.0" >> requirements-minimal.txt && \
    pip install --no-cache-dir -r requirements-minimal.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p staticfiles logs media

# Create a startup script with error handling
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "=== Starting Django Application ==="' >> /app/start.sh && \
    echo 'echo "Python version: $(python --version)"' >> /app/start.sh && \
    echo 'echo "Current directory: $(pwd)"' >> /app/start.sh && \
    echo 'echo "Directory contents:"' >> /app/start.sh && \
    echo 'ls -la' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Set environment variables' >> /app/start.sh && \
    echo 'export DJANGO_SETTINGS_MODULE=pyfactor.settings_eb' >> /app/start.sh && \
    echo 'export PYTHONUNBUFFERED=1' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Check if manage.py exists' >> /app/start.sh && \
    echo 'if [ ! -f "manage.py" ]; then' >> /app/start.sh && \
    echo '    echo "ERROR: manage.py not found!"' >> /app/start.sh && \
    echo '    exit 1' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Try to collect static files' >> /app/start.sh && \
    echo 'echo "Collecting static files..."' >> /app/start.sh && \
    echo 'python manage.py collectstatic --noinput || echo "Warning: collectstatic failed"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start Gunicorn' >> /app/start.sh && \
    echo 'echo "Starting Gunicorn..."' >> /app/start.sh && \
    echo 'exec gunicorn pyfactor.wsgi:application \' >> /app/start.sh && \
    echo '    --bind 0.0.0.0:8000 \' >> /app/start.sh && \
    echo '    --workers 2 \' >> /app/start.sh && \
    echo '    --timeout 120 \' >> /app/start.sh && \
    echo '    --access-logfile - \' >> /app/start.sh && \
    echo '    --error-logfile - \' >> /app/start.sh && \
    echo '    --log-level info' >> /app/start.sh && \
    chmod +x /app/start.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

EXPOSE 8000

# Use the startup script
CMD ["/app/start.sh"]
EOF

# Update .ebextensions for proper configuration
mkdir -p .ebextensions
cat > .ebextensions/01_docker.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONUNBUFFERED: 1
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    HealthCheckInterval: 30
    HealthCheckTimeout: 10
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 5
    Port: 8000
    Protocol: HTTP
EOF

# Remove problematic configurations
rm -f Dockerrun.aws.json
rm -f .ebextensions/02_docker.config

# Create a simple .ebignore
cat > .ebignore << 'EOF'
.venv/
venv/
.git/
.gitignore
*.pyc
__pycache__/
.DS_Store
node_modules/
frontend/
docs/
scripts/
backups/
*.log
*.sqlite3
.pytest_cache/
.coverage
EOF

echo "Proper Docker fix created."
echo ""
echo "Next steps:"
echo "1. Deploy: eb deploy"
echo "2. Monitor: eb logs"
echo "3. Check health: curl https://DottApp-prod.eba-dua2f3pi.us-east-1.elasticbeanstalk.com/health/" 