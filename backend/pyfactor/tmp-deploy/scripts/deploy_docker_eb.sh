#!/bin/bash
# deploy_docker_eb.sh
# Script to automate the deployment of the Docker-based application to AWS Elastic Beanstalk
# Created: May 17, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

echo "=== PyFactor Docker EB Deployment Script ==="
echo "Started at: $(date)"
echo "Working directory: $BACKEND_DIR"
echo ""

# Step 1: Install dependencies for the fix script
echo "Step 1: Installing dependencies..."
cd "$SCRIPT_DIR"
if [ ! -f "package.json" ]; then
    bash install_dependencies.sh
fi

# Step 2: Run the comprehensive fix script
echo "Step 2: Running comprehensive fix script..."
cd "$SCRIPT_DIR"
node Version0038_docker_eb_comprehensive_fix.js

# Find the latest minimal package (macOS compatible version)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS version (BSD find)
    LATEST_PACKAGE=$(find "$BACKEND_DIR" -name "minimal-eb-package-*.zip" -type f -exec stat -f "%m %N" {} \; | sort -nr | head -1 | cut -d' ' -f2-)
else
    # Linux version (GNU find)
    LATEST_PACKAGE=$(find "$BACKEND_DIR" -name "minimal-eb-package-*.zip" -type f -printf "%T@ %p\n" | sort -nr | head -1 | cut -d' ' -f2-)
fi

if [ -z "$LATEST_PACKAGE" ]; then
    echo "Error: No minimal package found. The fix script may have failed."
    exit 1
fi

echo "Found package: $LATEST_PACKAGE"

# Step 3: Deploy to AWS EB using AWS CLI (if available and configured)
echo "Step 3: Deployment options"
echo ""
echo "Choose deployment method:"
echo "1. AWS Management Console (manual upload)"
echo "2. AWS CLI (automated deployment)"
echo "3. Exit without deploying"
read -p "Enter your choice (1-3): " DEPLOY_CHOICE

case $DEPLOY_CHOICE in
    1)
        echo "Option 1 selected: Manual upload via AWS Management Console"
        echo ""
        echo "Please follow these steps:"
        echo "1. Sign in to the AWS Management Console"
        echo "2. Navigate to Elastic Beanstalk service"
        echo "3. Create a new application or use an existing one"
        echo "4. Create a new environment or update an existing one"
        echo "5. Upload the deployment package: $LATEST_PACKAGE"
        echo "6. Configure any required environment variables"
        echo "7. Submit and wait for deployment to complete"
        ;;
    2)
        echo "Option 2 selected: Automated deployment via AWS CLI"
        
        # Check if AWS CLI is installed
        if ! command -v aws &> /dev/null; then
            echo "Error: AWS CLI is not installed. Please install it first."
            exit 1
        fi
        
        # Get deployment parameters
        read -p "Enter AWS Elastic Beanstalk application name: " EB_APP_NAME
        read -p "Enter AWS Elastic Beanstalk environment name: " EB_ENV_NAME
        read -p "Enter S3 bucket name for upload: " S3_BUCKET
        
        # Version label
        VERSION_LABEL="docker-eb-$TIMESTAMP"
        S3_KEY=$(basename "$LATEST_PACKAGE")
        
        echo "Uploading package to S3..."
        aws s3 cp "$LATEST_PACKAGE" "s3://$S3_BUCKET/$S3_KEY"
        
        echo "Creating new application version..."
        aws elasticbeanstalk create-application-version \
            --application-name "$EB_APP_NAME" \
            --version-label "$VERSION_LABEL" \
            --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY"
        
        echo "Deploying to environment..."
        aws elasticbeanstalk update-environment \
            --environment-name "$EB_ENV_NAME" \
            --version-label "$VERSION_LABEL"
        
        echo "Deployment initiated. Check the AWS Elastic Beanstalk console for status."
        echo "You can monitor logs with:"
        echo "aws elasticbeanstalk retrieve-environment-info --environment-name $EB_ENV_NAME --info-type tail"
        ;;
    3)
        echo "Option 3 selected: Exit without deploying"
        echo "Deployment package created but not deployed: $LATEST_PACKAGE"
        ;;
    *)
        echo "Invalid choice. Exiting without deploying."
        echo "Deployment package created but not deployed: $LATEST_PACKAGE"
        ;;
esac

echo ""
echo "=== Deployment process completed ==="
echo "Finished at: $(date)" 