FROM python:3.12-slim

# Metadata
LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libc6-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements-eb.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-eb.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/static /app/media

# Expose port
EXPOSE 8000

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "pyfactor.wsgi:application"]
