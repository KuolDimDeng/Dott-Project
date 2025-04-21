#!/bin/bash

# run_auth_fix.sh
# Shell script to run the Cognito authentication fix

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}Cognito Authentication Fix Runner${NC}"
echo -e "${BLUE}=================================${NC}"
echo

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo -e "Please install Node.js and try again."
    exit 1
fi

# Check if npm or pnpm is installed
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
elif command -v npm &> /dev/null; then
    PACKAGE_MANAGER="npm"
else
    echo -e "${RED}Error: Neither pnpm nor npm is installed.${NC}"
    echo -e "Please install pnpm or npm and try again."
    exit 1
fi

echo -e "${YELLOW}Using package manager: ${PACKAGE_MANAGER}${NC}"
echo -e "${YELLOW}Project root: ${PROJECT_ROOT}${NC}"
echo

# Ensure fs and path modules are available
echo -e "${BLUE}Checking for required Node.js modules...${NC}"
if ! node -e "try { require('fs'); require('path'); } catch(e) { process.exit(1); }"; then
    echo -e "${YELLOW}Installing required Node.js modules...${NC}"
    $PACKAGE_MANAGER install fs path
fi

# Check if the fix script exists
AUTH_FIX_SCRIPT="${SCRIPT_DIR}/Version0001_fix_cognito_session_auth.js"
if [ ! -f "$AUTH_FIX_SCRIPT" ]; then
    echo -e "${RED}Error: Fix script not found at ${AUTH_FIX_SCRIPT}${NC}"
    exit 1
fi

# Print confirmation
echo -e "${YELLOW}This script will apply fixes to the following files:${NC}"
echo -e "  - frontend/pyfactor_next/src/utils/authUtils.js"
echo -e "  - frontend/pyfactor_next/src/config/amplifyUnified.js"
echo -e "  - frontend/pyfactor_next/src/app/auth/components/SignInForm.js"
echo
echo -e "${YELLOW}Backups will be created before any changes are made.${NC}"
echo

# Ask for confirmation
read -p "Do you want to continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Operation cancelled by user.${NC}"
    exit 1
fi

# Run the fix script
echo
echo -e "${BLUE}Running authentication fix script...${NC}"
echo

# Change to the script directory and use package.json to run the script
cd "$SCRIPT_DIR"
$PACKAGE_MANAGER run fix

# Check if script execution was successful
if [ $? -eq 0 ]; then
    echo
    echo -e "${GREEN}✅ Authentication fix script completed successfully!${NC}"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "1. Restart the Next.js development server:"
    echo -e "   ${BLUE}cd ${PROJECT_ROOT}/frontend/pyfactor_next && $PACKAGE_MANAGER run dev:https${NC}"
    echo -e "2. Clear browser cache or use a private/incognito window"
    echo -e "3. Test signing in and out of the application"
    echo
    echo -e "${YELLOW}If you experience issues, you can restore from the backups created in:${NC}"
    echo -e "${BLUE}${PROJECT_ROOT}/frontend/pyfactor_next/backups/${NC}"
else
    echo
    echo -e "${RED}❌ Authentication fix script failed.${NC}"
    echo -e "Please check the output above for errors."
    echo
    echo -e "${YELLOW}You can try running the script directly using:${NC}"
    echo -e "${BLUE}cd ${SCRIPT_DIR} && $PACKAGE_MANAGER run fix${NC}"
fi

echo
echo -e "${BLUE}=================================${NC}"
echo 