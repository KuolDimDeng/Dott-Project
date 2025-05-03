#!/bin/bash

# Script: run_auth_fix.sh
# Version: 1.0
# Purpose: Apply Cognito authentication network error fixes
# Date: 2025-04-19

# Ensure we exit on error
set -e

# Print script header
echo "====================================================="
echo "Cognito Authentication Network Error Fix (v1.0)"
echo "====================================================="
echo "This script will fix authentication errors related to AWS Cognito"
echo "connectivity issues and implement the circuit breaker pattern."
echo

# Validate environment
if [ ! -d "frontend/pyfactor_next" ]; then
  echo "Error: frontend/pyfactor_next directory not found!"
  echo "Please run this script from the project root directory."
  exit 1
fi

# Create scripts directory if it doesn't exist
if [ ! -d "frontend/pyfactor_next/scripts" ]; then
  echo "Creating scripts directory..."
  mkdir -p frontend/pyfactor_next/scripts
fi

# Create docs directory if it doesn't exist
if [ ! -d "frontend/pyfactor_next/docs" ]; then
  echo "Creating docs directory..."
  mkdir -p frontend/pyfactor_next/docs
fi

# Ensure AuthInitializer component directory exists
if [ ! -d "frontend/pyfactor_next/src/components" ]; then
  echo "Creating components directory..."
  mkdir -p frontend/pyfactor_next/src/components
fi

# Create backups directory if it doesn't exist
if [ ! -d "frontend/pyfactor_next/backups" ]; then
  echo "Creating backups directory..."
  mkdir -p frontend/pyfactor_next/backups
fi

echo "Step 1: Running Cognito network error fix script..."
cd frontend/pyfactor_next
node scripts/20250419_fix_cognito_network_errors.js

echo "Step 2: Enhancing Amplify resiliency module..."
node scripts/20250419_enhance_amplify_resiliency.js

echo "Step 3: Adding AuthInitializer to layout..."
node scripts/integrate_auth_initializer.js

echo "Step 4: Creating backup of current state..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/auth_fix_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp src/config/amplifyUnified.js $BACKUP_DIR/
cp src/utils/networkMonitor.js $BACKUP_DIR/
cp src/utils/amplifyResiliency.js $BACKUP_DIR/
cp src/middleware.js $BACKUP_DIR/ 2>/dev/null || true
cp src/components/AuthInitializer.js $BACKUP_DIR/
cp docs/COGNITO_NETWORK_FIX.md $BACKUP_DIR/

echo
echo "====================================================="
echo "Fix applied successfully!"
echo "Backups created in: $BACKUP_DIR"
echo "Documentation available at: docs/COGNITO_NETWORK_FIX.md"
echo
echo "To restart the server with these changes:"
echo "1. Stop the current server (Ctrl+C)"
echo "2. Run: pnpm run dev:https"
echo "=====================================================" 