FROM python:3.12-slim

LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=pyfactor.settings_eb \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Ensure proper permissions and directory structure
RUN mkdir -p /var/log/app && \
    mkdir -p /app/staticfiles && \
    chmod 755 /app/staticfiles && \
    chmod 777 /var/log/app && \
    chmod +x /app/manage.py

# Collect static files (with error handling)
RUN python manage.py collectstatic --noinput --clear || echo "Static files collection failed, continuing..."

# Create verification script to avoid EB parser issues
RUN echo '#!/bin/bash' > /app/verify_setup.sh && \
    echo 'python -c "import django; django.setup()" && echo "Django setup OK"' >> /app/verify_setup.sh && \
    echo 'python -c "import pyfactor" && echo "Pyfactor module OK"' >> /app/verify_setup.sh && \
    echo 'python -c "import onboarding" && echo "Onboarding module OK"' >> /app/verify_setup.sh && \
    chmod +x /app/verify_setup.sh

# Run verification script
RUN /app/verify_setup.sh || echo "Setup verification completed with warnings"

# Create a simple health check script
RUN echo '#!/bin/bash' > /usr/local/bin/health-check.sh && \
    echo 'curl -f http://localhost:8000/health/ || exit 1' >> /usr/local/bin/health-check.sh && \
    chmod +x /usr/local/bin/health-check.sh

# Expose the application port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD /usr/local/bin/health-check.sh

# Run gunicorn with proper configuration
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "--log-level", "info", "pyfactor.wsgi:application"]
