#!/bin/bash
# Comprehensive deployment script that applies all fixes and deploys
# Created by Version0024_update_deployment_guide.py

set -e
echo "=========================================================="
echo "   COMPREHENSIVE AWS ELASTIC BEANSTALK DEPLOYMENT SCRIPT  "
echo "=========================================================="
echo "Running comprehensive fixes and deployment..."

# Step 1: Apply comprehensive PostgreSQL AL2023 fixes
echo -e "
1. Applying PostgreSQL AL2023 fixes..."
python scripts/Version0023_fix_prebuild_postgresql_devel.py

# Step 2: Create minimal optimized package
echo -e "
2. Creating minimal optimized deployment package..."
python scripts/Version0019_create_minimal_package.py

# Get the latest minimal package
PACKAGE=$(ls -t minimal-fixed-package-*.zip | head -1)

if [ -z "$PACKAGE" ]; then
    echo "❌ Error: No deployment package found!"
    exit 1
fi

echo -e "
✅ Found package: $PACKAGE"
echo "----------------------------------------"
echo "DEPLOYMENT OPTIONS:"
echo "----------------------------------------"
echo "1. AWS Console Manual Upload: "
echo "   a) Log in to the AWS Elastic Beanstalk Console"
echo "   b) Navigate to your environment"
echo "   c) Click 'Upload and deploy'"
echo "   d) Upload $PACKAGE"
echo "   e) Set version label to 'fixed-comprehensive-$(date +%Y%m%d)'"
echo "   f) Click 'Deploy'"
echo 
echo "2. EB CLI Deployment: "
echo "   Run: eb deploy -l fixed-comprehensive-$(date +%Y%m%d) --staged"
echo "----------------------------------------"

read -p "Do you want to deploy using EB CLI now? (y/n): " DEPLOY_NOW

if [[ $DEPLOY_NOW == "y" || $DEPLOY_NOW == "Y" ]]; then
    if command -v eb &> /dev/null; then
        echo -e "
3. Deploying using EB CLI..."
        eb deploy -l fixed-comprehensive-$(date +%Y%m%d) --staged
        echo "✅ Deployment command executed. Check EB logs for status."
    else
        echo "❌ EB CLI not found. Please install with 'pip install awsebcli' or deploy manually."
    fi
else
    echo -e "
3. Skipping deployment. You can deploy manually using methods described above."
fi

echo -e "
=========================================================="
echo "For more details, see COMPREHENSIVE_DEPLOYMENT_GUIDE.md"
echo "=========================================================="
