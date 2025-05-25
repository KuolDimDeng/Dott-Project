FROM python:3.12-slim

LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings
ENV PORT=8000

# Set working directory
WORKDIR /app

# Install setuptools first to fix build issues
RUN pip install --no-cache-dir setuptools wheel

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements-eb.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-eb.txt

# Copy project files
COPY . .

# Create a non-root user to run the application
RUN adduser --disabled-password --gecos "" appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose the application port
EXPOSE 8000

# Set entry point
CMD gunicorn pyfactor.wsgi:application --bind 0.0.0.0:$PORT
