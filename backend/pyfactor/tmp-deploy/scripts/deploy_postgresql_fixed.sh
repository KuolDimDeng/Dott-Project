#!/bin/bash
# Script to create and deploy an updated package with PostgreSQL fixes
# Created by Version0017_fix_postgresql_package_deployment.py

set -e

echo "==== Creating Optimized Deployment Package with PostgreSQL Fixes ===="
cd /Users/kuoldeng/projectx/backend/pyfactor

# Clean up any Python bytecode files
find . -type d -name "__pycache__" -exec rm -rf {} +
find . -name "*.pyc" -delete
find . -name "*.pyo" -delete
find . -name "*.pyd" -delete

# Create a ZIP file with all necessary files
echo "Creating ZIP file..."
zip -r postgresql-fixed-package.zip . -x "*.git*" -x "*.pyc" -x "*.pyo" -x "*.pyd" -x "*__pycache__*" -x "*.DS_Store" -x "*.venv*" -x "*.idea*" -x "*.ipynb_checkpoints*"

echo ""
echo "==== Deployment Package Created: postgresql-fixed-package.zip ===="
echo ""
echo "To deploy through AWS Elastic Beanstalk Console:"
echo "1. Log into AWS Console and navigate to Elastic Beanstalk"
echo "2. Select your environment"
echo "3. Choose 'Upload and deploy'"
echo "4. Upload the postgresql-fixed-package.zip file"
echo "5. Click 'Deploy'"
echo ""
echo "To deploy using EB CLI:"
echo "eb deploy --staged"
echo ""
