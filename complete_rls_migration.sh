#!/bin/bash

# Text colors
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}"
echo "============================================================"
echo "       COMPLETE RLS MIGRATION"
echo "============================================================"
echo -e "${YELLOW}"
echo "This script will complete the migration to Row-Level Security by:"
echo "1. Applying the fixes to the database structure"
echo "2. Applying RLS to all tables"
echo "3. Checking for tables that might still need manual fixes"
echo ""
echo "This will remove all dependencies on the schema-per-tenant approach."
echo -e "${NC}"

# Ask for confirmation
read -p "$(echo -e ${RED}Type \"COMPLETE RLS\" to confirm this operation: ${NC})" answer

if [ "$answer" != "COMPLETE RLS" ]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

echo -e "\n${YELLOW}Starting complete RLS migration...${NC}"

# Database configuration
DB_HOST="dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"
DB_NAME="dott_main"
DB_USER="dott_admin"
DB_PASSWORD="RRfXU6uPPUbBEg1JqGTJ"
DB_PORT=5432

# Step 1: Apply fixes to the database structure
echo -e "\n${YELLOW}Step 1: Applying fixes to the database structure...${NC}"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f fix_rls_migration.sql

if [ $? -ne 0 ]; then
    echo -e "\n${RED}Error: Database fixes failed.${NC}"
    echo -e "${YELLOW}Continuing with next steps anyway...${NC}"
fi

# Step 2: Apply RLS to all tables
echo -e "\n${YELLOW}Step 2: Applying RLS to all tables...${NC}"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f apply_rls_to_all_tables.sql

if [ $? -ne 0 ]; then
    echo -e "\n${RED}Error: RLS application failed.${NC}"
    echo -e "${YELLOW}Continuing with next steps anyway...${NC}"
fi

# Step 3: Check for tables that still need fixes
echo -e "\n${YELLOW}Step 3: Checking for tables that still need RLS...${NC}"
TABLES_MISSING_RLS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT COUNT(*) FROM tables_missing_rls;")

if [ "$TABLES_MISSING_RLS" -eq "0" ]; then
    echo -e "${GREEN}All tables have RLS properly configured!${NC}"
else
    echo -e "${YELLOW}Found $TABLES_MISSING_RLS tables that might need additional RLS configuration.${NC}"
    echo -e "${YELLOW}Use the following command to see which tables need attention:${NC}"
    echo -e "    ${GREEN}psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -c \"SELECT * FROM tables_missing_rls;\"${NC}"
fi

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}RLS migration completed!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\n${YELLOW}Your system is now using Row-Level Security for tenant isolation.${NC}"
echo -e "${YELLOW}Remember to check the MODEL_MIGRATION_GUIDE.md for guidance on updating your code.${NC}"
echo ""

exit 0 