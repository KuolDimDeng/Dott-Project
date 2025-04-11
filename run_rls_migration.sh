#!/bin/bash

# Text colors
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}"
echo "============================================================"
echo "       APPLY RLS-ONLY MIGRATION"
echo "============================================================"
echo -e "${YELLOW}"
echo "This script will apply the RLS migration to your database."
echo "It will:"
echo "1. Update tables to have tenant_id columns"
echo "2. Apply RLS policies to all tables"
echo "3. Mark all tenants as using RLS"
echo "4. Make schema_name optional in the tenant table"
echo ""
echo "After this migration, your database will use ONLY Row-Level Security"
echo "for tenant isolation and will not rely on schemas."
echo -e "${NC}"

# Ask for confirmation
read -p "$(echo -e ${RED}Type \"APPLY RLS ONLY\" to confirm this operation: ${NC})" answer

if [ "$answer" != "APPLY RLS ONLY" ]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

echo -e "\n${YELLOW}Applying RLS migration...${NC}"

# Get database configuration
DB_HOST="dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"
DB_NAME="dott_main"
DB_USER="dott_admin"
DB_PASSWORD="RRfXU6uPPUbBEg1JqGTJ"
DB_PORT=5432

# Apply the migration directly
echo -e "\n${YELLOW}Executing RLS migration SQL...${NC}"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f migrate_to_rls_final.sql

if [ $? -ne 0 ]; then
    echo -e "\n${RED}Error: RLS migration failed. Database may be in an inconsistent state.${NC}"
    exit 1
fi

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}RLS migration completed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\n${YELLOW}Your database is now using Row-Level Security for tenant isolation.${NC}"
echo -e "${YELLOW}Schema-per-tenant approach is now fully deprecated.${NC}"
echo ""

exit 0 