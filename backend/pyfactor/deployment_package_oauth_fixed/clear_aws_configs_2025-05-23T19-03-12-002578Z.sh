#!/bin/bash
# Clear AWS Elastic Beanstalk Saved Configurations
# This script helps remove cached configurations that might contain invalid settings

set -e

echo "=== Clearing AWS Elastic Beanstalk Saved Configurations ==="
echo "Timestamp: $(date)"

cd "/Users/kuoldeng/projectx/backend/pyfactor"

# Check AWS CLI
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS CLI not configured. Please run 'aws configure'"
    exit 1
fi

# List current saved configurations
echo "📋 Current saved configurations:"
aws elasticbeanstalk describe-configuration-templates --application-name DottApps || echo "No saved configurations found"

echo ""
echo "⚠️  Manual steps required in AWS Console:"
echo "1. Go to: https://console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1#/application/overview?applicationName=DottApps"
echo "2. Click 'Saved configurations'"
echo "3. Delete any saved configurations that contain proxy settings"
echo "4. Return here and press Enter to continue with deployment"

read -p "Press Enter after clearing saved configurations in AWS Console..."

echo "🚀 Proceeding with clean deployment..."
eb deploy --staged --timeout 20

echo "✅ Deployment completed"
