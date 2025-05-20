#!/bin/bash
# deploy_with_config.sh
# Script to deploy using the existing AWS Elastic Beanstalk environment configuration
# Created: May 18, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
CONFIG_DIR="$BACKEND_DIR/eb_configs"
SAVED_CONFIG_FILE="$CONFIG_DIR/Dott-env-dev-config-$TIMESTAMP.json"

# Create config directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

echo "=== PyFactor Docker EB Deployment Script with Configuration ==="
echo "Started at: $(date)"
echo "Working directory: $BACKEND_DIR"
echo ""

# Step 1: Install dependencies for the fix script if needed
echo "Step 1: Checking dependencies..."
cd "$SCRIPT_DIR"
if [ ! -f "package.json" ]; then
    bash install_dependencies.sh
fi

# Step 2: Check for AWS CLI installation
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed. Please install it first."
    exit 1
fi

# Step 3: Find the latest minimal package
echo "Step 3: Finding deployment package..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS version (BSD find)
    LATEST_PACKAGE=$(find "$BACKEND_DIR" -name "minimal-eb-package-*.zip" -type f -exec stat -f "%m %N" {} \; | sort -nr | head -1 | cut -d' ' -f2-)
else
    # Linux version (GNU find)
    LATEST_PACKAGE=$(find "$BACKEND_DIR" -name "minimal-eb-package-*.zip" -type f -printf "%T@ %p\n" | sort -nr | head -1 | cut -d' ' -f2-)
fi

if [ -z "$LATEST_PACKAGE" ]; then
    read -p "No deployment package found. Run the comprehensive fix script now? (y/n): " RUN_FIX
    
    if [[ "$RUN_FIX" == "y" ]]; then
        echo "Running comprehensive fix script..."
        node "$SCRIPT_DIR/Version0038_docker_eb_comprehensive_fix.js"
        
        # Find the package again
        if [[ "$OSTYPE" == "darwin"* ]]; then
            LATEST_PACKAGE=$(find "$BACKEND_DIR" -name "minimal-eb-package-*.zip" -type f -exec stat -f "%m %N" {} \; | sort -nr | head -1 | cut -d' ' -f2-)
        else
            LATEST_PACKAGE=$(find "$BACKEND_DIR" -name "minimal-eb-package-*.zip" -type f -printf "%T@ %p\n" | sort -nr | head -1 | cut -d' ' -f2-)
        fi
        
        if [ -z "$LATEST_PACKAGE" ]; then
            echo "Error: Still no package found after running the fix script."
            exit 1
        fi
    else
        echo "Error: No deployment package found. Please run the fix script first."
        exit 1
    fi
fi

echo "Found package: $LATEST_PACKAGE"

# Step 4: Save the current environment configuration
echo "Step 4: Saving current environment configuration..."
echo "Retrieving configuration from Dott-env-dev..."

aws elasticbeanstalk describe-configuration-settings \
    --application-name "Dott" \
    --environment-name "Dott-env-dev" > "$SAVED_CONFIG_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Failed to retrieve environment configuration"
    exit 1
fi

echo "Configuration saved to: $SAVED_CONFIG_FILE"

# Extract the option settings only for deploying
jq '.ConfigurationSettings[0].OptionSettings' "$SAVED_CONFIG_FILE" > "$CONFIG_DIR/option_settings.json"

# Step 5: Deploy with the saved configuration
echo "Step 5: Deploying with saved configuration..."

# Get S3 bucket information
read -p "Enter S3 bucket name for upload: " S3_BUCKET

# Version label
VERSION_LABEL="docker-eb-$TIMESTAMP"
S3_KEY=$(basename "$LATEST_PACKAGE")

echo "Uploading package to S3..."
aws s3 cp "$LATEST_PACKAGE" "s3://$S3_BUCKET/$S3_KEY"

echo "Creating new application version..."
aws elasticbeanstalk create-application-version \
    --application-name "Dott" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY"

echo "Deploying to environment with saved configuration..."
aws elasticbeanstalk update-environment \
    --environment-name "Dott-env-dev" \
    --version-label "$VERSION_LABEL" \
    --option-settings file://"$CONFIG_DIR/option_settings.json"

echo "Deployment initiated with existing configuration."
echo "Check the AWS Elastic Beanstalk console for status."
echo "You can monitor logs with:"
echo "aws elasticbeanstalk retrieve-environment-info --environment-name Dott-env-dev --info-type tail"

echo ""
echo "=== Deployment process completed ==="
echo "Finished at: $(date)" 