FROM python:3.12-slim

# Install system dependencies including PostgreSQL client
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt /app/

# Install Python dependencies with specific versions
RUN pip install --upgrade pip==24.0 && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app/

# Create necessary directories with proper permissions
RUN mkdir -p /app/staticfiles /app/media /app/logs && \
    chmod -R 755 /app/staticfiles && \
    chmod -R 755 /app/media && \
    chmod -R 755 /app/logs

# Collect static files during build
RUN python manage.py collectstatic --noinput || echo "Static collection skipped"

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb
ENV PORT=8000

# Create a non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Expose port
EXPOSE 8000

# Run the application with proper signal handling
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "--log-level", "info", "--access-logfile", "-", "--error-logfile", "-", "--worker-tmp-dir", "/dev/shm", "pyfactor.wsgi:application"]
