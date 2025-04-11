#!/bin/bash

# Script to fix and restart Next.js 15 app with proper params handling
echo "Starting Next.js 15 fixes deployment"

# Navigate to the project directory
cd "$(dirname "$0")/frontend/pyfactor_next"

# Clear build cache
echo "Clearing Next.js build cache..."
rm -rf .next

# Install any missing dependencies (in case AWS SDK issues)
echo "Checking for AWS SDK dependencies..."
pnpm add @aws-sdk/client-cognito-identity-provider --ignore-workspace-root-check

# Restart the development server
echo "Restarting the development server..."
echo "Press Ctrl+C to stop the server once it's running properly"
pnpm dev 