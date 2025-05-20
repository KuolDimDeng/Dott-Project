#!/bin/bash
# install_dependencies.sh
# Script to install Node.js dependencies required for Version0038_docker_eb_comprehensive_fix.js
# Created: May 17, 2025

set -e

echo "Installing dependencies for AWS EB Docker deployment fix..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "pnpm is not installed. Please install it first."
    echo "You can install it using: npm install -g pnpm"
    exit 1
fi

# Create package.json if it doesn't exist
if [ ! -f "package.json" ]; then
    echo "Creating package.json..."
    echo '{
  "name": "aws-eb-docker-deployment-scripts",
  "version": "1.0.0",
  "description": "Scripts for AWS EB Docker deployment",
  "type": "module",
  "scripts": {
    "fix-docker-deployment": "node Version0038_docker_eb_comprehensive_fix.js"
  }
}' > package.json
fi

# Install required packages using pnpm
echo "Installing required packages using pnpm..."
pnpm add archiver fs-extra path child_process

echo "Dependencies installed successfully!"
echo ""
echo "To run the deployment fix script, use:"
echo "cd /Users/kuoldeng/projectx/backend/pyfactor/scripts"
echo "node Version0038_docker_eb_comprehensive_fix.js" 