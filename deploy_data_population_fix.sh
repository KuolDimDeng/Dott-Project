#!/bin/bash

# Deploy data population fix for support@dottapps.com
# This ensures they can see data for all entity types

echo "=========================================="
echo "DEPLOYING DATA POPULATION FIX"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verify we're in the right directory
if [ ! -f "backend/pyfactor/manage.py" ]; then
    echo -e "${RED}❌ Error: Not in project root directory${NC}"
    echo "Please run from /Users/kuoldeng/projectx"
    exit 1
fi

echo -e "${GREEN}✅ In correct directory${NC}"

# Step 1: Test the scripts locally
echo ""
echo -e "${YELLOW}Step 1: Testing scripts locally...${NC}"

cd backend/pyfactor

# Check Python syntax
echo "Checking Python syntax..."
python3 -m py_compile scripts/populate_support_data.py custom_auth/management/commands/populate_test_data.py

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Python syntax errors found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python syntax OK${NC}"

cd ../..

# Step 2: Commit the changes
echo ""
echo -e "${YELLOW}Step 2: Committing changes...${NC}"

git add backend/pyfactor/scripts/populate_support_data.py
git add backend/pyfactor/custom_auth/management/commands/populate_test_data.py

git status

echo ""
echo -e "${YELLOW}Creating commit...${NC}"
git commit -m "Add data population commands for support@dottapps.com

- Added populate_test_data management command
- Creates test data for all entity types (Services, Customers, Invoices, etc.)
- Ensures support@dottapps.com can see data for testing
- Fixes issue where Services, Customers, Invoices showed 0 count

This helps with testing tenant isolation and ensures all features work."

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  No changes to commit (files may already be committed)${NC}"
fi

# Step 3: Push to main branch
echo ""
echo -e "${YELLOW}Step 3: Pushing to main branch...${NC}"
git push origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push to main branch${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pushed to main branch${NC}"

# Step 4: Instructions for production
echo ""
echo -e "${YELLOW}Step 4: After deployment completes, run on production:${NC}"
echo ""
echo "SSH into production and run:"
echo ""
echo "1. First check current data:"
echo "   python manage.py populate_test_data --dry-run"
echo ""
echo "2. Populate missing data:"
echo "   python manage.py populate_test_data"
echo ""
echo "3. Run tenant isolation fix:"
echo "   python manage.py fix_tenant_isolation"
echo ""
echo "4. Verify specific user data:"
echo "   python manage.py fix_tenant_isolation --user support@dottapps.com"
echo ""
echo "5. Test the API endpoints:"
echo "   curl -H 'Cookie: sid=YOUR_SESSION_ID' https://api.dottapps.com/api/services/"
echo "   curl -H 'Cookie: sid=YOUR_SESSION_ID' https://api.dottapps.com/api/crm/customers/"
echo "   curl -H 'Cookie: sid=YOUR_SESSION_ID' https://api.dottapps.com/api/invoices/"
echo ""
echo -e "${GREEN}=========================================="
echo "DEPLOYMENT INITIATED SUCCESSFULLY!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Wait for deployment to complete (5-10 minutes)"
echo "2. SSH into production server"
echo "3. Run the populate_test_data command"
echo "4. Verify support@dottapps.com can see all data types"