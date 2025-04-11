#!/bin/bash

# Text colors
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}"
echo "============================================================"
echo "       DATABASE RESET SCRIPT - RLS ONLY APPROACH"
echo "============================================================"
echo -e "${YELLOW}"
echo "This script will:"
echo "1. Reset your database using the clean-database.cjs script (RLS only mode)"
echo "2. Run Django migrations to recreate all tables properly"
echo "3. Set up proper RLS policies"
echo ""
echo "This approach ensures your database will use ONLY Row-Level Security"
echo "and NO schema-per-tenant isolation."
echo -e "${NC}"

# Ask for confirmation
read -p "$(echo -e ${RED}Type \"RLS ONLY RESET\" to confirm this operation: ${NC})" answer

if [ "$answer" != "RLS ONLY RESET" ]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

echo -e "\n${YELLOW}Starting RLS-only database reset process...${NC}"

# Step 1: Run the database cleanup script
echo -e "\n${YELLOW}Step 1: Running database cleanup script in RLS-only mode...${NC}"
node scripts/clean-database.cjs --rls-only <<< "RESET DATABASE"

if [ $? -ne 0 ]; then
    echo -e "\n${RED}Error: Database cleanup failed. Aborting.${NC}"
    exit 1
fi

# Step 2: Run Django migrations to recreate tables
echo -e "\n${YELLOW}Step 2: Running Django migrations to recreate all tables...${NC}"

# Navigate to the Django project directory
cd backend/pyfactor || {
    echo -e "\n${RED}Error: Could not find backend/pyfactor directory. Aborting.${NC}"
    exit 1
}

# Check if Python virtual environment is active
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}Note: No Python virtual environment detected. Using system Python.${NC}"
    echo -e "${YELLOW}If you have a virtual environment for this project, activate it first.${NC}"
    echo ""
fi

# Run migrations
echo "Running Django migrations..."
python manage.py migrate

if [ $? -ne 0 ]; then
    echo -e "\n${RED}Error: Django migrations failed. Database may be in an inconsistent state.${NC}"
    cd ../../ # Return to the original directory
    exit 1
fi

# Apply RLS migration
echo -e "\n${YELLOW}Step 3: Applying RLS migration...${NC}"
python manage.py migrate_to_rls_final

if [ $? -ne 0 ]; then
    echo -e "\n${RED}Error: RLS migration failed. Database may be in an inconsistent state.${NC}"
    cd ../../ # Return to the original directory
    exit 1
fi

# Return to the original directory
cd ../../

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}Database reset and RLS migration completed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\n${YELLOW}Your database has been completely reset and configured to use only RLS.${NC}"
echo -e "${YELLOW}Tenant isolation is now handled by Row-Level Security policies.${NC}"
echo ""

exit 0 