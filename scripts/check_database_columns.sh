#!/bin/bash

# Script to check database columns in staging and production
# This helps identify schema differences between environments

echo "================================================"
echo "DATABASE SCHEMA CHECK FOR POS FIX"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check columns in a database
check_database() {
    local ENV_NAME=$1
    local DATABASE_URL=$2
    
    echo -e "\n${YELLOW}Checking $ENV_NAME Database...${NC}"
    echo "----------------------------------------"
    
    # Use psql to check if critical columns exist
    psql "$DATABASE_URL" -t -c "
        SELECT 
            'finance_journalentryline' as table_name,
            EXISTS(SELECT 1 FROM information_schema.columns 
                   WHERE table_name='finance_journalentryline' 
                   AND column_name='tenant_id') as has_tenant_id,
            EXISTS(SELECT 1 FROM information_schema.columns 
                   WHERE table_name='finance_journalentryline' 
                   AND column_name='business_id') as has_business_id,
            COUNT(*) as row_count
        FROM finance_journalentryline
        UNION ALL
        SELECT 
            'finance_journalentry' as table_name,
            EXISTS(SELECT 1 FROM information_schema.columns 
                   WHERE table_name='finance_journalentry' 
                   AND column_name='tenant_id') as has_tenant_id,
            EXISTS(SELECT 1 FROM information_schema.columns 
                   WHERE table_name='finance_journalentry' 
                   AND column_name='business_id') as has_business_id,
            COUNT(*) as row_count
        FROM finance_journalentry
        UNION ALL
        SELECT 
            'finance_chartofaccount' as table_name,
            EXISTS(SELECT 1 FROM information_schema.columns 
                   WHERE table_name='finance_chartofaccount' 
                   AND column_name='tenant_id') as has_tenant_id,
            EXISTS(SELECT 1 FROM information_schema.columns 
                   WHERE table_name='finance_chartofaccount' 
                   AND column_name='business_id') as has_business_id,
            COUNT(*) as row_count
        FROM finance_chartofaccount
    " 2>/dev/null | while read -r line; do
        if [[ ! -z "$line" ]]; then
            IFS='|' read -r table has_tenant has_business rows <<< "$line"
            table=$(echo $table | xargs)
            has_tenant=$(echo $has_tenant | xargs)
            has_business=$(echo $has_business | xargs)
            rows=$(echo $rows | xargs)
            
            echo -e "\n📋 Table: $table"
            echo "  Rows: $rows"
            
            if [[ "$has_tenant" == "t" ]]; then
                echo -e "  ${GREEN}✓ tenant_id exists${NC}"
            else
                echo -e "  ${RED}✗ tenant_id MISSING${NC}"
            fi
            
            if [[ "$has_business" == "t" ]]; then
                echo -e "  ${GREEN}✓ business_id exists${NC}"
            else
                echo -e "  ${RED}✗ business_id MISSING${NC}"
            fi
        fi
    done
}

# Check if we have database URLs
if [ -z "$STAGING_DATABASE_URL" ] || [ -z "$PRODUCTION_DATABASE_URL" ]; then
    echo -e "${RED}❌ Missing database URLs${NC}"
    echo "Please set environment variables:"
    echo "  export STAGING_DATABASE_URL='postgresql://...'"
    echo "  export PRODUCTION_DATABASE_URL='postgresql://...'"
    echo ""
    echo "You can get these from Render dashboard:"
    echo "  1. Go to https://dashboard.render.com"
    echo "  2. Click on your database service"
    echo "  3. Copy the 'External Database URL'"
    exit 1
fi

# Check both databases
check_database "STAGING" "$STAGING_DATABASE_URL"
check_database "PRODUCTION" "$PRODUCTION_DATABASE_URL"

echo -e "\n================================================"
echo -e "${GREEN}✅ Database check complete!${NC}"
echo "================================================"