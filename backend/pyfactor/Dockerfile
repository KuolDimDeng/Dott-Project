# Use an official Python runtime as a parent image
FROM --platform=$BUILDPLATFORM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    libopenjp2-7-dev \
    libssl-dev \
    libffi-dev \
    netcat-openbsd \  
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY new_requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r new_requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Create a non-root user
RUN adduser --disabled-password --gecos '' appuser

# Create directories for static and media files
RUN mkdir -p /app/staticfiles /app/mediafiles

# Copy the entrypoint script and make it executable
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Give ownership to the appuser
RUN chown -R appuser:appuser /app

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 8000

# Use the entrypoint script
ENTRYPOINT ["./entrypoint.sh"]

# Command to run the application
CMD ["daphne", "pyfactor.asgi:application", "-b", "0.0.0.0", "-p", "8000"]