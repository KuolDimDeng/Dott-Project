#!/bin/bash

# Force Complete Docker Rebuild for Maximum Security
set -e

echo "🚀 Force Complete Docker Rebuild"
echo "================================"

REGION="us-east-1"
ENVIRONMENT_NAME="DottApps-Max-Security-Fixed"
CLOUDFRONT_ID="E2BYTRL6S1FNTF"

echo "🔧 Strategy:"
echo "• Change Python base image version to bypass ALL cache"
echo "• Explicitly install all dependencies"
echo "• Fresh build guaranteed"
echo ""

# Create deployment directory
rm -rf force-rebuild
mkdir force-rebuild

# Copy all files
cp -r pyfactor force-rebuild/
cp manage.py force-rebuild/
cp requirements.txt force-rebuild/

# Create new Dockerfile with different base image
cat > force-rebuild/Dockerfile << 'DOCKEREOF'
# Use specific version to force new base
FROM python:3.12.3-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y gcc curl && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn whitenoise

# Copy app
COPY . .

# Setup directories
RUN mkdir -p /var/log/app /app/staticfiles && chmod -R 755 /app

# Create user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Run
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "pyfactor.wsgi:application"]
DOCKEREOF

# Create nginx config
mkdir -p force-rebuild/.platform/nginx/conf.d
cat > force-rebuild/.platform/nginx/conf.d/proxy.conf << 'NGINXEOF'
upstream docker {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://docker;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
}
NGINXEOF

# Package and deploy
cd force-rebuild
zip -r ../force-rebuild.zip . -q
cd ..

VERSION="force-rebuild-$(date +%Y%m%d%H%M%S)"

aws s3 cp force-rebuild.zip s3://elasticbeanstalk-us-east-1-471112661935/$VERSION.zip --region $REGION

aws elasticbeanstalk create-application-version \
    --application-name "Dott" \
    --version-label "$VERSION" \
    --source-bundle S3Bucket=elasticbeanstalk-us-east-1-471112661935,S3Key=$VERSION.zip \
    --region $REGION

aws elasticbeanstalk update-environment \
    --environment-name "$ENVIRONMENT_NAME" \
    --version-label "$VERSION" \
    --region $REGION

echo ""
echo "✅ Deployment started with COMPLETE rebuild!"
echo "⏳ This will take 5-10 minutes..."
echo "🔄 Docker will download new base image"
echo "✅ All dependencies will be freshly installed"

rm -rf force-rebuild force-rebuild.zip 