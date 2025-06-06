#!/bin/bash

echo "🧹 Cleaning up duplicate and backup .env files..."

# Backend backups (safe to remove)
echo "Removing backend .env backups..."
rm -f backend/pyfactor/.env.backup*
rm -f backend/pyfactor/.env.bak*

# Frontend backups (safe to remove) 
echo "Removing frontend .env backups..."
rm -f frontend/pyfactor_next/.env.backup*
rm -f frontend/pyfactor_next/.env.local.backup*
rm -f frontend/pyfactor_next/.env.production.backup*
rm -f frontend/pyfactor_next/production.env.backup*
rm -f frontend/pyfactor_next/amplify.env.example.backup*

# Remove duplicate/old env files in subdirectories
echo "Removing backup .env files in subdirectories..."
find . -name "*.env.backup*" -type f -delete
find . -name "*.env.bak*" -type f -delete
find . -path "./node_modules" -prune -o -name "*.env.*backup*" -type f -delete

# Remove old AWS backup files
echo "Removing old AWS backup files..."
rm -f .env.backup_aws_*
rm -f .env.development.backup_aws_*
rm -f db.env.backup_aws_*

# Remove files in backup directories that contain env files
echo "Removing .env files in backup directories..."
find ./backend/pyfactor/backups -name "*.env*" -type f -delete 2>/dev/null || true
find ./backend/pyfactor/deployment_package_oauth_fixed -name "*.env*" -type f -delete 2>/dev/null || true

echo "✅ Cleanup complete!"
echo ""
echo "📋 Remaining .env files:"
find . -name "*.env*" -type f | grep -E "\.(env|env\..*)" | grep -v node_modules | sort 