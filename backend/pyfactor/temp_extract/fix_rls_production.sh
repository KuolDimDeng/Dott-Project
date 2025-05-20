#!/bin/bash

# Production-Ready RLS Fix Script
# This script fixes Row Level Security issues in production environments.

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ${GREEN}Production RLS Fix - Tenant Isolation Solution${BLUE}        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

# Check if virtual environment is active
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}Warning: No Python virtual environment detected.${NC}"
    
    # Check if .venv directory exists in the current directory
    if [ -d ".venv" ]; then
        echo -e "${YELLOW}Attempting to activate local virtual environment...${NC}"
        source .venv/bin/activate
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Successfully activated virtual environment.${NC}"
        else
            echo -e "${RED}Failed to activate virtual environment.${NC}"
            echo -e "${YELLOW}You may need to activate your Python virtual environment manually.${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Using system Python. It's recommended to use a virtual environment.${NC}"
    fi
fi

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo -e "${RED}Error: Python not found. Please make sure Python is installed.${NC}"
    exit 1
fi

# Confirm execution
echo -e "${YELLOW}This script will fix Row Level Security (RLS) issues in your database.${NC}"
echo -e "${YELLOW}It will create or update RLS functions and apply proper policies.${NC}"
echo -e "${YELLOW}These changes are designed to be safe for production environments.${NC}"
echo ""
echo -e "${YELLOW}Do you want to proceed? (y/n)${NC}"
read confirm

if [ "$confirm" != "y" ]; then
    echo -e "${RED}Operation cancelled.${NC}"
    exit 1
fi

# Run the fix script
echo -e "${GREEN}Running RLS production fix script...${NC}"
python fix_rls_production.py

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}═════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}RLS fix completed successfully!${NC}"
    echo -e "${GREEN}═════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Recommended next steps:${NC}"
    echo -e "${YELLOW}1. Restart your Django application to ensure changes take effect${NC}"
    echo -e "${YELLOW}2. Verify tenant isolation by testing your application${NC}"
    echo -e "${YELLOW}3. Review logs in rls_production_fix.log${NC}"
else
    echo -e "${RED}═════════════════════════════════════════════════════${NC}"
    echo -e "${RED}RLS fix encountered errors.${NC}"
    echo -e "${RED}═════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Please check the rls_production_fix.log file for details.${NC}"
    echo -e "${YELLOW}You may need to run the following to reset your database:${NC}"
    echo -e "${YELLOW}  ./scripts/reset-database.sh${NC}"
fi

# Provide helpful next command suggestions
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "${GREEN}python run_https_server_fixed.py ${BLUE}- Start server with fixed RLS configuration${NC}"
echo -e "${GREEN}psql -c \"SELECT * FROM rls_status;\" ${BLUE}- Check RLS status for all tables${NC}"

# Done
exit 0 