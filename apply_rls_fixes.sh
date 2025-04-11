#!/bin/bash

# Text colors
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}"
echo "============================================================"
echo "       APPLY RLS FIXES"
echo "============================================================"
echo -e "${YELLOW}"
echo "This script will fix issues with the RLS migration by:"
echo "1. Adding the rls_setup_date column if it doesn't exist"
echo "2. Making schema_name nullable"
echo "3. Ensuring tenant_id exists in custom_auth_tenant table"
echo "4. Updating tenant records to use RLS"
echo ""
echo "This will correct any errors in the previous migration."
echo -e "${NC}"

# Ask for confirmation
read -p "$(echo -e ${RED}Type \"APPLY FIXES\" to confirm this operation: ${NC})" answer

if [ "$answer" != "APPLY FIXES" ]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

echo -e "\n${YELLOW}Applying RLS fixes...${NC}"

# Get database configuration
DB_HOST="dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"
DB_NAME="dott_main"
DB_USER="dott_admin"
DB_PASSWORD="RRfXU6uPPUbBEg1JqGTJ"
DB_PORT=5432

# Apply the fixes
echo -e "\n${YELLOW}Executing RLS fixes SQL...${NC}"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f fix_rls_migration.sql

if [ $? -ne 0 ]; then
    echo -e "\n${RED}Error: RLS fixes failed. Database may be in an inconsistent state.${NC}"
    exit 1
fi

# Now try to apply the full migration again
echo -e "\n${YELLOW}Reapplying full RLS migration...${NC}"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f migrate_to_rls_final.sql

if [ $? -ne 0 ]; then
    echo -e "\n${RED}Warning: Full RLS migration had some errors, but fixes were applied.${NC}"
    echo -e "${YELLOW}Your database should still be functioning with RLS.${NC}"
    exit 1
fi

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}RLS fixes completed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\n${YELLOW}Your database is now using Row-Level Security for tenant isolation.${NC}"
echo -e "${YELLOW}Schema-per-tenant approach is now fully deprecated.${NC}"
echo ""

exit 0 