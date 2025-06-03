FROM python:3.12-slim

# Force cache invalidation with timestamp
ARG CACHE_BUST=1
RUN echo "Cache bust: $CACHE_BUST"

# Set working directory
WORKDIR /app

# Install system dependencies first
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .

# Install Python packages (this will now use new requirements.txt)
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn whitenoise

# Copy application code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /var/log/app && \
    mkdir -p /app/staticfiles && \
    chmod 755 /app/staticfiles && \
    chmod 777 /var/log/app && \
    chmod +x /app/manage.py

# Collect static files (this should now work with setuptools)
RUN python manage.py collectstatic --noinput

# Create a non-root user to run the application
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app /var/log/app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Start the application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "pyfactor.wsgi:application"]
