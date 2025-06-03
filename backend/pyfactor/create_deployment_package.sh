#!/bin/bash

# Create deployment package for AWS Elastic Beanstalk
set -e

echo "Creating deployment package..."

# Clean up old packages
rm -f deploy.zip

# Create deployment package excluding unnecessary files
zip -r deploy.zip . \
    -x "*.git*" \
    -x "*.venv*" \
    -x "*__pycache__*" \
    -x "*.pyc" \
    -x "*.pyo" \
    -x "*.backup*" \
    -x "*_backup*" \
    -x "staticfiles/*" \
    -x "media/*" \
    -x "logs/*" \
    -x "*.log" \
    -x ".DS_Store" \
    -x "Thumbs.db" \
    -x "deploy.zip"

echo "Deployment package created: deploy.zip"
echo "Size: $(du -h deploy.zip | cut -f1)"
