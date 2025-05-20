#!/bin/bash
# Script to deploy with fixed PostgreSQL-devel reference for AL2023
# Created by Version0022_fix_postgresql_devel_custom_config.py

set -e
echo "Preparing optimized deployment package with PostgreSQL-devel AL2023 fixes..."

# Create the minimal package
python scripts/Version0019_create_minimal_package.py

# Get the latest minimal package
PACKAGE=$(ls -t minimal-fixed-package-*.zip | head -1)

if [ -z "$PACKAGE" ]; then
    echo "Error: No deployment package found!"
    exit 1
fi

echo "Found package: $PACKAGE"
echo ""
echo "To deploy this package:"
echo "1. Log in to the AWS Elastic Beanstalk Console"
echo "2. Navigate to your environment"
echo "3. Click 'Upload and deploy'"
echo "4. Upload $PACKAGE"
echo "5. Set version label to 'fixed-postgresql-devel-al2023-$(date +%Y%m%d)'"
echo "6. Click 'Deploy'"
echo ""
echo "Or to deploy using the EB CLI, run:"
echo "eb deploy -l fixed-postgresql-devel-al2023-$(date +%Y%m%d) --staged"
echo ""

read -p "Do you want to deploy using EB CLI now? (y/n): " DEPLOY_NOW

if [[ $DEPLOY_NOW == "y" || $DEPLOY_NOW == "Y" ]]; then
    if command -v eb &> /dev/null; then
        echo "Deploying using EB CLI..."
        eb deploy -l fixed-postgresql-devel-al2023-$(date +%Y%m%d) --staged
    else
        echo "EB CLI not found. Please install with 'pip install awsebcli' or deploy manually."
    fi
else
    echo "Skipping deployment. You can deploy manually using the AWS Console."
fi
