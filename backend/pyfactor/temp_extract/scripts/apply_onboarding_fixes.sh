#!/bin/bash

# Script to apply all onboarding fixes
# This script will:
# 1. Apply patches to the code
# 2. Run the fix script to update the database

# Set up variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKEND_DIR="$PROJECT_ROOT/pyfactor"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command succeeded
check_success() {
    if [ $? -eq 0 ]; then
        print_message "$1"
    else
        print_error "$2"
        exit 1
    fi
}

# Create backup of files before patching
create_backup() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "${file}.bak"
        check_success "Created backup of $file" "Failed to create backup of $file"
    else
        print_error "File $file does not exist"
        exit 1
    fi
}

# Main script starts here
print_message "Starting onboarding fixes application..."

# Check if we're in the right directory
if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Backend directory not found at $BACKEND_DIR"
    print_message "Current directory structure:"
    ls -la "$PROJECT_ROOT"
    exit 1
fi

# Create backups
print_message "Creating backups..."
create_backup "$BACKEND_DIR/onboarding/views/views.py"
create_backup "$BACKEND_DIR/users/models.py"

# Apply patches
print_message "Applying patches..."

# Apply patch to SaveStep1View.post method
cd "$BACKEND_DIR" || exit 1
patch -p2 < "$SCRIPT_DIR/fix_save_business_info.patch"
check_success "Applied fix_save_business_info.patch" "Failed to apply fix_save_business_info.patch"

# Apply patch to Business model
patch -p2 < "$SCRIPT_DIR/fix_business_model.patch"
check_success "Applied fix_business_model.patch" "Failed to apply fix_business_model.patch"

# Run the fix script
print_message "Running database fix script..."
cd "$SCRIPT_DIR" || exit 1
python fix_onboarding_issues_final_comprehensive.py
check_success "Successfully ran fix script" "Failed to run fix script"

# Final message
print_message "All onboarding fixes have been applied!"
print_message "Please restart your application to apply the changes."
print_message "If you encounter any issues, you can restore the backups:"
print_message "  - $BACKEND_DIR/onboarding/views/views.py.bak"
print_message "  - $BACKEND_DIR/users/models.py.bak"

exit 0