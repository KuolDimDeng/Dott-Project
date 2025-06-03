#!/bin/bash
# Update deployment package with fixes

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create deployment package
echo "Creating deployment package..."
zip -r ../eb-deployment-fixed.zip . \
    -x "*.git*" \
    -x "*__pycache__*" \
    -x "*.pyc" \
    -x "*venv*" \
    -x "*node_modules*" \
    -x "*.log" \
    -x "*backups*" \
    -x "*temp*" \
    -x "*.DS_Store"

echo "✓ Deployment package created: ../eb-deployment-fixed.zip"
echo ""
echo "To deploy, run:"
echo "  eb deploy --staged"
