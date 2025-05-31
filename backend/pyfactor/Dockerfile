FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements-eb.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements-eb.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p staticfiles logs media

# Create startup script that can run either health server or Django
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Check if we should run in health-only mode' >> /app/start.sh && \
    echo 'if [ "$HEALTH_ONLY" = "true" ]; then' >> /app/start.sh && \
    echo '    echo "=== Starting Simple Health Server ===" ' >> /app/start.sh && \
    echo '    python simple_health_server.py' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '    echo "=== Django Application Startup ===" ' >> /app/start.sh && \
    echo '    echo "Time: $(date)" ' >> /app/start.sh && \
    echo '    echo "Python: $(python --version)" ' >> /app/start.sh && \
    echo '    echo "Working directory: $(pwd)" ' >> /app/start.sh && \
    echo '    echo "DJANGO_SETTINGS_MODULE: $DJANGO_SETTINGS_MODULE" ' >> /app/start.sh && \
    echo '    echo "Testing Django configuration..." ' >> /app/start.sh && \
    echo '    python -c "import django; django.setup(); print(\"Django setup successful\")" || (echo "ERROR: Django setup failed!"; exit 1)' >> /app/start.sh && \
    echo '    echo "Collecting static files..." ' >> /app/start.sh && \
    echo '    python manage.py collectstatic --noinput --verbosity 0' >> /app/start.sh && \
    echo '    echo "Starting Gunicorn server..." ' >> /app/start.sh && \
    echo '    exec gunicorn pyfactor.wsgi:application \' >> /app/start.sh && \
    echo '        --bind 0.0.0.0:8000 \' >> /app/start.sh && \
    echo '        --workers 2 \' >> /app/start.sh && \
    echo '        --worker-class gthread \' >> /app/start.sh && \
    echo '        --threads 4 \' >> /app/start.sh && \
    echo '        --timeout 120 \' >> /app/start.sh && \
    echo '        --keep-alive 5 \' >> /app/start.sh && \
    echo '        --max-requests 1000 \' >> /app/start.sh && \
    echo '        --max-requests-jitter 100 \' >> /app/start.sh && \
    echo '        --access-logfile - \' >> /app/start.sh && \
    echo '        --error-logfile - \' >> /app/start.sh && \
    echo '        --log-level info' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port 8000
EXPOSE 8000

# Use our startup script
CMD ["/app/start.sh"]
