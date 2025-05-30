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
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "=== Django Application Startup ==="' >> /app/start.sh && \
    echo 'echo "Time: $(date)"' >> /app/start.sh && \
    echo 'echo "Python: $(python --version)"' >> /app/start.sh && \
    echo 'echo "Working directory: $(pwd)"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Set environment variables' >> /app/start.sh && \
    echo 'export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-pyfactor.settings_eb}' >> /app/start.sh && \
    echo 'export PYTHONUNBUFFERED=1' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Log environment' >> /app/start.sh && \
    echo 'echo "DJANGO_SETTINGS_MODULE: $DJANGO_SETTINGS_MODULE"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Check for critical files' >> /app/start.sh && \
    echo 'if [ ! -f "manage.py" ]; then' >> /app/start.sh && \
    echo '    echo "ERROR: manage.py not found!"' >> /app/start.sh && \
    echo '    ls -la' >> /app/start.sh && \
    echo '    exit 1' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'if [ ! -d "pyfactor" ]; then' >> /app/start.sh && \
    echo '    echo "ERROR: pyfactor directory not found!"' >> /app/start.sh && \
    echo '    ls -la' >> /app/start.sh && \
    echo '    exit 1' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Test Django configuration' >> /app/start.sh && \
    echo 'echo "Testing Django configuration..."' >> /app/start.sh && \
    echo 'python -c "import django; django.setup()" || {' >> /app/start.sh && \
    echo '    echo "ERROR: Django setup failed!"' >> /app/start.sh && \
    echo '    exit 1' >> /app/start.sh && \
    echo '}' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Collect static files' >> /app/start.sh && \
    echo 'echo "Collecting static files..."' >> /app/start.sh && \
    echo 'python manage.py collectstatic --noinput || echo "Warning: collectstatic failed, continuing..."' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start Gunicorn' >> /app/start.sh && \
    echo 'echo "Starting Gunicorn server..."' >> /app/start.sh && \
    echo 'exec gunicorn pyfactor.wsgi:application \' >> /app/start.sh && \
    echo '    --bind 0.0.0.0:8000 \' >> /app/start.sh && \
    echo '    --workers 2 \' >> /app/start.sh && \
    echo '    --threads 2 \' >> /app/start.sh && \
    echo '    --timeout 120 \' >> /app/start.sh && \
    echo '    --access-logfile - \' >> /app/start.sh && \
    echo '    --error-logfile - \' >> /app/start.sh && \
    echo '    --log-level info \' >> /app/start.sh && \
    echo '    --capture-output \' >> /app/start.sh && \
    echo '    --enable-stdio-inheritance' >> /app/start.sh && \
    chmod +x /app/start.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

EXPOSE 8000

# Run the startup script
CMD ["/app/start.sh"]
