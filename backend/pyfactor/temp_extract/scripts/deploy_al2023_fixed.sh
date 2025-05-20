#!/bin/bash
# Deployment script for AL2023 with PostgreSQL fix
# Created by Version0020_fix_postgresql_dependency_al2023.py

set -e

echo "Preparing deployment with AL2023 PostgreSQL fix..."

# Current directory
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# Create a timestamp
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Create a version label
VERSION_LABEL="fixed-al2023-$TIMESTAMP"

# Create minimal package with fixes
echo "Creating minimal deployment package..."
python scripts/Version0019_create_minimal_package.py

# Get the latest minimal package
MINIMAL_PACKAGE=$(ls -t minimal-fixed-package-*.zip | head -1)

if [ -z "$MINIMAL_PACKAGE" ]; then
    echo "Error: Could not find minimal package. Run Version0019_create_minimal_package.py first."
    exit 1
fi

echo "Using package: $MINIMAL_PACKAGE"

# Use eb cli to deploy
if command -v eb &> /dev/null; then
    echo "Deploying using Elastic Beanstalk CLI..."
    eb deploy -v --staged --label "$VERSION_LABEL"
else
    echo "Elastic Beanstalk CLI not found."
    echo "To deploy manually:"
    echo "1. Upload $MINIMAL_PACKAGE to AWS Elastic Beanstalk Console"
    echo "2. Use version label: $VERSION_LABEL"
fi

echo "Deployment preparation complete!"
