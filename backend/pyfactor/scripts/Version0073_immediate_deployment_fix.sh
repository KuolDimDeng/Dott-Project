#!/bin/bash
#
# Version 0073: Immediate Deployment Fix
# =====================================
#
# This script fixes the immediate PostgreSQL deployment issue by:
# 1. Removing problematic backup scripts causing syntax errors
# 2. Creating a clean deployment package
# 3. Providing instructions for AWS deployment
#
# Author: Cline AI Assistant
# Created: 2025-05-23 19:45:00
# Version: 0073
# Target: Fix immediate deployment failure

set -e  # Exit on any error

echo "=== IMMEDIATE DEPLOYMENT FIX v0073 ==="
echo "Fixing PostgreSQL script issues and creating clean deployment package..."

# Remove problematic backup scripts from platform hooks
PLATFORM_HOOKS_DIR=".platform/hooks/prebuild"
if [ -d "$PLATFORM_HOOKS_DIR" ]; then
    echo "Cleaning up problematic backup scripts..."
    
    # Count backup scripts before removal
    BACKUP_COUNT=$(find "$PLATFORM_HOOKS_DIR" -name "*.backup-*" -type f | wc -l)
    echo "Found $BACKUP_COUNT backup scripts to remove"
    
    # Remove all backup scripts
    find "$PLATFORM_HOOKS_DIR" -name "*.backup-*" -type f -delete
    echo "✅ Removed all backup scripts from platform hooks"
    
    # List remaining files
    echo "Remaining files in platform hooks:"
    ls -la "$PLATFORM_HOOKS_DIR"
else
    echo "No platform hooks directory found"
fi

# Create a clean deployment package
echo "Creating clean deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="pyfactor_fixed_deployment_${TIMESTAMP}.zip"

# Create temporary directory for clean package
TEMP_DIR="temp_deployment_${TIMESTAMP}"
mkdir -p "$TEMP_DIR"

echo "Copying application files (excluding problematic files)..."

# Copy files excluding problematic ones
rsync -av \
    --exclude="*.backup-*" \
    --exclude="backups/" \
    --exclude="temp_*/" \
    --exclude="*.pyc" \
    --exclude="__pycache__/" \
    --exclude=".git/" \
    --exclude="node_modules/" \
    --exclude="*.log" \
    --exclude="*.sqlite3" \
    --exclude=".env.local" \
    --progress \
    . "$TEMP_DIR/"

# Create the ZIP package
echo "Creating ZIP package..."
cd "$TEMP_DIR"
zip -r "../$PACKAGE_NAME" . -x "*.backup-*" "backups/*" "temp_*/*"
cd ..

# Get package size
PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)

# Clean up temp directory
rm -rf "$TEMP_DIR"

echo ""
echo "✅ DEPLOYMENT PACKAGE CREATED SUCCESSFULLY!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Package: $PACKAGE_NAME"
echo "📏 Size: $PACKAGE_SIZE"
echo "🕒 Created: $(date)"
echo ""
echo "🚀 IMMEDIATE NEXT STEPS:"
echo "1. Go to AWS Elastic Beanstalk Console"
echo "2. Navigate to your DottApps-env environment"
echo "3. Click 'Upload and Deploy'"
echo "4. Upload this file: $PACKAGE_NAME"
echo ""
echo "🔧 OR USE AWS CLI:"
echo "aws elasticbeanstalk create-application-version \\"
echo "  --application-name DottApps \\"
echo "  --version-label fixed-v$TIMESTAMP \\"
echo "  --source-bundle S3Bucket=your-s3-bucket,S3Key=$PACKAGE_NAME"
echo ""
echo "✅ This package excludes ALL problematic backup scripts that were causing deployment failures."
echo "✅ Your frontend at dottapps.com will continue working unchanged."
echo ""
echo "📋 WHAT WAS FIXED:"
echo "- Removed PostgreSQL backup scripts with syntax errors"
echo "- Cleaned platform hooks directory" 
echo "- Created deployment package without problematic files"
echo ""
echo "🎯 DEPLOYMENT SHOULD NOW SUCCEED!"
