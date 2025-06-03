#!/bin/bash

# Version 0094: Fix python-dotenv dependency
# This script adds python-dotenv to requirements.txt to fix the ModuleNotFoundError

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Version 0094: Fix python-dotenv dependency ==="
echo "Backend directory: $BACKEND_DIR"

# Navigate to backend directory
cd "$BACKEND_DIR"

# Create backup of requirements.txt
cp requirements.txt requirements.txt.backup.v0094

# Check if python-dotenv is already in requirements.txt
if grep -q "python-dotenv" requirements.txt; then
    echo "python-dotenv is already in requirements.txt"
else
    echo "Adding python-dotenv to requirements.txt..."
    # Find the line with python-decouple and add python-dotenv after it
    # Use macOS-compatible sed syntax
    sed -i '' '/python-decouple==3.8/a\
python-dotenv==1.0.1' requirements.txt
fi

# Display the updated requirements.txt
echo ""
echo "Updated requirements.txt:"
cat requirements.txt

# Create deployment package
echo ""
echo "Creating deployment package..."
rm -f eb-deployment.zip
zip -r eb-deployment.zip . \
    -x "*.git*" \
    -x "*.venv*" \
    -x "*__pycache__*" \
    -x "*.pyc" \
    -x "scripts/*" \
    -x "*.backup*" \
    -x "*.log" \
    -x "node_modules/*" \
    -x "frontend/*" \
    -x "staticfiles/*" \
    -x "media/*" \
    -x "*.sqlite3" \
    -x "*.env" \
    -x ".ebextensions/*" \
    -x ".platform/hooks/prebuild/*"

# Check package size
PACKAGE_SIZE=$(ls -lh eb-deployment.zip | awk '{print $5}')
echo ""
echo "Deployment package created: eb-deployment.zip ($PACKAGE_SIZE)"
echo ""
echo "Deploy with: eb deploy"

# Update script registry
REGISTRY_FILE="$SCRIPT_DIR/script_registry.md"
if [ -f "$REGISTRY_FILE" ]; then
    echo "" >> "$REGISTRY_FILE"
    echo "### Version0094_fix_python_dotenv_dependency.sh" >> "$REGISTRY_FILE"
    echo "- **Purpose**: Fix ModuleNotFoundError by adding python-dotenv to requirements.txt" >> "$REGISTRY_FILE"
    echo "- **Key Changes**:" >> "$REGISTRY_FILE"
    echo "  - Added python-dotenv==1.0.1 to requirements.txt" >> "$REGISTRY_FILE"
    echo "  - python-dotenv is required by settings.py for load_dotenv import" >> "$REGISTRY_FILE"
    echo "- **Result**: Fixes Docker container crash due to missing dotenv module" >> "$REGISTRY_FILE"
    echo "- **Date**: $(date)" >> "$REGISTRY_FILE"
fi

echo ""
echo "Script completed successfully!"
echo "Next steps:"
echo "1. Deploy with: eb deploy"
echo "2. Monitor deployment status in AWS console"
echo "3. Check application logs after deployment"