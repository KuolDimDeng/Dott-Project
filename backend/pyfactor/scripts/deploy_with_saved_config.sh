#!/bin/bash
# deploy_with_saved_config.sh
# Script to deploy using the saved AWS Elastic Beanstalk configuration named "DottConfiguration"
# Created: May 18, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
LOG_FILE="$BACKEND_DIR/deployment-$TIMESTAMP.log"

# Log both to console and file
log() {
    echo "$@" | tee -a "$LOG_FILE"
}

echo "=== PyFactor Docker EB Deployment with Saved Configuration ===" | tee -a "$LOG_FILE"
echo "Started at: $(date)" | tee -a "$LOG_FILE"
echo "Working directory: $BACKEND_DIR" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Step 1: Install dependencies for the fix script if needed
log "Step 1: Checking dependencies..."
cd "$SCRIPT_DIR"
if [ ! -f "package.json" ]; then
    bash install_dependencies.sh 2>&1 | tee -a "$LOG_FILE"
fi

# Step 2: Check for AWS CLI installation
if ! command -v aws &> /dev/null; then
    log "Error: AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check AWS CLI configuration
log "Verifying AWS CLI configuration..."
if ! aws sts get-caller-identity &>/dev/null; then
    log "Error: AWS CLI is not properly configured. Please run 'aws configure' first."
    exit 1
fi
log "AWS CLI configuration verified successfully."

# Step 3: Find the latest minimal package
log "Step 3: Finding deployment package..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS version (BSD find)
    LATEST_PACKAGE=$(find "$BACKEND_DIR" -name "minimal-eb-package-*.zip" -type f -exec stat -f "%m %N" {} \; | sort -nr | head -1 | cut -d' ' -f2-)
else
    # Linux version (GNU find)
    LATEST_PACKAGE=$(find "$BACKEND_DIR" -name "minimal-eb-package-*.zip" -type f -printf "%T@ %p\n" | sort -nr | head -1 | cut -d' ' -f2-)
fi

if [ -z "$LATEST_PACKAGE" ]; then
    read -p "No deployment package found. Run the comprehensive fix script now? (y/n): " RUN_FIX
    echo "User selected: $RUN_FIX" >> "$LOG_FILE"
    
    if [[ "$RUN_FIX" == "y" ]]; then
        log "Running comprehensive fix script..."
        node "$SCRIPT_DIR/Version0038_docker_eb_comprehensive_fix.js" 2>&1 | tee -a "$LOG_FILE"
        
        # Find the package again
        if [[ "$OSTYPE" == "darwin"* ]]; then
            LATEST_PACKAGE=$(find "$BACKEND_DIR" -name "minimal-eb-package-*.zip" -type f -exec stat -f "%m %N" {} \; | sort -nr | head -1 | cut -d' ' -f2-)
        else
            LATEST_PACKAGE=$(find "$BACKEND_DIR" -name "minimal-eb-package-*.zip" -type f -printf "%T@ %p\n" | sort -nr | head -1 | cut -d' ' -f2-)
        fi
        
        if [ -z "$LATEST_PACKAGE" ]; then
            log "Error: Still no package found after running the fix script."
            exit 1
        fi
    else
        log "Error: No deployment package found. Please run the fix script first."
        exit 1
    fi
fi

log "Found package: $LATEST_PACKAGE"
log "Package size: $(du -h "$LATEST_PACKAGE" | cut -f1)"

# Step 4: Get S3 bucket information
log "Step 4: Preparing for deployment..."
read -p "Enter S3 bucket name for upload: " S3_BUCKET
echo "S3 bucket: $S3_BUCKET" >> "$LOG_FILE"

# Verify S3 bucket exists and is accessible
log "Verifying S3 bucket access..."
if ! aws s3 ls "s3://$S3_BUCKET" &>/dev/null; then
    log "Error: Cannot access S3 bucket '$S3_BUCKET'. Please check if it exists and you have access."
    exit 1
fi
log "S3 bucket access verified."

# Step 5: Deploy using the saved configuration
log "Step 5: Deploying with saved configuration 'DottConfiguration'..."

# Version label
VERSION_LABEL="docker-eb-$TIMESTAMP"
S3_KEY=$(basename "$LATEST_PACKAGE")

log "Uploading package to S3..."
if ! aws s3 cp "$LATEST_PACKAGE" "s3://$S3_BUCKET/$S3_KEY" 2>&1 | tee -a "$LOG_FILE"; then
    log "Error: Failed to upload package to S3."
    exit 1
fi
log "Upload complete."

log "Creating new application version..."
if ! aws elasticbeanstalk create-application-version \
    --application-name "Dott" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" 2>&1 | tee -a "$LOG_FILE"; then
    log "Error: Failed to create application version."
    exit 1
fi
log "Application version created."

# Verify the saved configuration template exists
log "Verifying configuration template 'DottConfiguration'..."
if ! aws elasticbeanstalk describe-configuration-settings \
    --application-name "Dott" \
    --template-name "DottConfiguration" &>/dev/null; then
    log "Error: Configuration template 'DottConfiguration' not found."
    exit 1
fi
log "Configuration template verified."

log "Deploying to environment with saved configuration template..."
aws elasticbeanstalk update-environment \
    --environment-name "Dott-env-dev" \
    --version-label "$VERSION_LABEL" \
    --template-name "DottConfiguration" 2>&1 | tee -a "$LOG_FILE"

log "Deployment initiated with saved configuration 'DottConfiguration'."
log "Check the AWS Elastic Beanstalk console for status."

# Monitor deployment status
log "Monitoring deployment status (press Ctrl+C to stop monitoring)..."
echo ""
echo "Current environment events:"
aws elasticbeanstalk describe-events \
    --environment-name "Dott-env-dev" \
    --max-items 5 2>&1 | tee -a "$LOG_FILE"

echo ""
log "To continue monitoring deployment status:"
log "  aws elasticbeanstalk describe-environments --environment-names Dott-env-dev"
log ""
log "To view detailed environment events:"
log "  aws elasticbeanstalk describe-events --environment-name Dott-env-dev --max-items 25"
log ""
log "To retrieve application logs:"
log "  aws elasticbeanstalk retrieve-environment-info --environment-name Dott-env-dev --info-type tail"
log "  aws elasticbeanstalk retrieve-environment-info --environment-name Dott-env-dev --info-type tail | jq '.EnvironmentInfo[].Message' -r"

echo ""
log "=== Deployment process completed ==="
log "Finished at: $(date)"
log "Log file: $LOG_FILE" 