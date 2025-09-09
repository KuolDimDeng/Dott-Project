#!/bin/bash

# Business Wallet Deployment Script
# This script deploys the business wallet feature

echo "=========================================="
echo "Business Wallet Feature Deployment"
echo "=========================================="

# Create migrations for wallet models
echo "Creating migrations for wallet models..."
python manage.py makemigrations payments --noinput

# Apply migrations
echo "Applying migrations..."
python manage.py migrate

echo "=========================================="
echo "Deployment complete!"
echo "=========================================="