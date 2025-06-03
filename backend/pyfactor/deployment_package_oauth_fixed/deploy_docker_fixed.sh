#!/bin/bash

# Docker Deployment Script - Fixed Version
# Date: 2025-05-23

set -e

echo "Starting Docker deployment for AWS Elastic Beanstalk..."

# Change to backend directory
cd "$(dirname "$0")"

# Clean up any problematic files
echo "Cleaning up problematic configuration files..."
find . -name "*.config" -path "*/.ebextensions*" -exec grep -l "proxy:staticfiles" {} \; | head -5 | xargs rm -f

# Create deployment package
echo "Creating deployment package..."
PACKAGE_NAME="dottapps-docker-fixed-$(date +%Y%m%d-%H%M%S).zip"

# Include only necessary files
zip -r "$PACKAGE_NAME" \
    --exclude="*.git*" \
    --exclude="*/__pycache__/*" \
    --exclude="*/migrations/*" \
    --exclude="*.pyc" \
    --exclude="*.log" \
    --exclude="*.backup*" \
    --exclude="*/.venv/*" \
    --exclude="*/node_modules/*" \
    --exclude="*/scripts/*" \
    --exclude="*/backups/*" \
    --exclude="*/temp_*/*" \
    --exclude="*/deployment_backups/*" \
    --exclude="*/configuration_backups/*" \
    . >/dev/null

echo "Created deployment package: $PACKAGE_NAME"
echo "Package size: $(du -h "$PACKAGE_NAME" | cut -f1)"

echo "Deployment package ready. Upload to Elastic Beanstalk console or use EB CLI:"
echo "eb deploy --staged"

# Verify package contents
echo "Package contents verification:"
unzip -l "$PACKAGE_NAME" | head -20

echo "Docker deployment preparation complete!"
