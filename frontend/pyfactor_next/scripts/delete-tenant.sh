#!/bin/bash

# Text colors
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "============================================================"
echo "            TENANT DELETION SCRIPT WRAPPER"
echo "============================================================"
echo -e "${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js before running this script."
    exit 1
fi

# Default script paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ESM_SCRIPT="${SCRIPT_DIR}/delete-tenant.js"
CJS_SCRIPT="${SCRIPT_DIR}/delete-tenant.cjs"

# Check for required Node.js modules
echo -e "${YELLOW}Installing required Node.js modules if needed...${NC}"
npm install pg dotenv --no-save >/dev/null 2>&1

# Make sure both scripts are executable
chmod +x "${ESM_SCRIPT}" "${CJS_SCRIPT}" 2>/dev/null

# Check if scripts exist
if [ ! -f "$ESM_SCRIPT" ] && [ ! -f "$CJS_SCRIPT" ]; then
    echo -e "${RED}Error: Could not find any tenant deletion scripts in ${SCRIPT_DIR}${NC}"
    exit 1
fi

# Try to run the ESM version first
if [ -f "$ESM_SCRIPT" ]; then
    echo -e "${YELLOW}Trying ESM version...${NC}"
    node "$ESM_SCRIPT" "$@"
    ESM_RESULT=$?
    
    # If successful, exit
    if [ $ESM_RESULT -eq 0 ]; then
        echo -e "\n${GREEN}Tenant deletion script completed successfully.${NC}"
        exit 0
    else
        echo -e "\n${YELLOW}ESM version failed, trying CommonJS version...${NC}"
    fi
fi

# If ESM failed or doesn't exist, try the CJS version
if [ -f "$CJS_SCRIPT" ]; then
    echo -e "${YELLOW}Running CommonJS version...${NC}"
    node "$CJS_SCRIPT" "$@"
    CJS_RESULT=$?
    
    if [ $CJS_RESULT -eq 0 ]; then
        echo -e "\n${GREEN}Tenant deletion script completed successfully.${NC}"
        exit 0
    else
        echo -e "\n${RED}CommonJS version also failed.${NC}"
        exit 1
    fi
else
    echo -e "\n${RED}CommonJS script not found at ${CJS_SCRIPT}${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Usage examples:${NC}"
echo "  ./delete-tenant.sh <tenant-id>    # Delete a specific tenant"
echo "  ./delete-tenant.sh --all          # Delete all tenants"
echo ""

exit 0 