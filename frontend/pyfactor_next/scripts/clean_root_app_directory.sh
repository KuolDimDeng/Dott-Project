#!/bin/bash

# Clean Root App Directory Script
# This script renames the app directory at the root level of the Next.js project
# to avoid confusion with the src/app directory that is actually used.

# Define paths
PROJECT_ROOT="/Users/kuoldeng/projectx"
FRONTEND_DIR="$PROJECT_ROOT/frontend/pyfactor_next"
APP_DIR="$FRONTEND_DIR/app"
BACKUP_DIR="$FRONTEND_DIR/app_backup_$(date +%Y%m%d_%H%M%S)"

# Check if the root app directory exists
if [ -d "$APP_DIR" ]; then
  echo "Found app directory at root level: $APP_DIR"
  
  # Create backup directory
  mkdir -p "$BACKUP_DIR"
  echo "Created backup directory: $BACKUP_DIR"
  
  # Copy files to backup
  cp -r "$APP_DIR"/* "$BACKUP_DIR"
  echo "Backed up all files from root app directory"
  
  # Remove the original directory (or rename it if you prefer)
  rm -rf "$APP_DIR"
  echo "Removed the root app directory"
  
  echo "Success: Root app directory has been backed up and removed."
  echo "The Next.js app will now exclusively use the src/app directory."
else
  echo "No app directory found at the root level. No action needed."
fi

# Create a .gitkeep in the backup directory to ensure it's tracked by git
touch "$BACKUP_DIR/.gitkeep"

echo "Script completed." 