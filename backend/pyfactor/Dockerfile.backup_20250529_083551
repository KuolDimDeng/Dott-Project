FROM python:3.12-slim

LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn whitenoise

# Copy project
COPY . .

# Create necessary directories
RUN mkdir -p /var/log/app && \
    mkdir -p /app/staticfiles && \
    chmod 755 /app/staticfiles && \
    chmod 777 /var/log/app && \
    chmod +x /app/manage.py

# Collect static files
RUN python manage.py collectstatic --noinput

# Create a non-root user to run the application
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /var/log/app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "3", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "pyfactor.wsgi:application"]
