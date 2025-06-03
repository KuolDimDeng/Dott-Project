# Dockerfile for Python Django - Updated by Version0039_fix_docker_build.js application with PostgreSQL support
# Created by Version0025_docker_based_deployment.py
# Updated for port compatibility with EB Docker

FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    gcc \
    python3-dev \
    default-libmysqlclient-dev \
    curl \
    wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements-eb.txt .
RUN pip install --no-cache-dir -r requirements-eb.txt

# Copy application
COPY application.py .
COPY Dockerrun.aws.json .

# Create logs directory
RUN mkdir -p logs

# Create the required directories as EB might expect them
RUN mkdir -p /var/app/current
RUN ln -sf /var/app /var/app/current

# Expose port 8080 for EB Nginx compatibility
EXPOSE 8080

# Command to run the app on port 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "application:application"]
