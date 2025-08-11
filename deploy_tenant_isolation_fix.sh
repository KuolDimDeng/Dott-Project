#!/bin/bash

# Deploy tenant isolation fix to production
# This ensures users can only see their own data

echo "=========================================="
echo "DEPLOYING TENANT ISOLATION FIX"
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

# Step 1: Test the fixes locally first
echo ""
echo -e "${YELLOW}Step 1: Testing fixes locally...${NC}"

cd backend/pyfactor

# Check Python syntax
echo "Checking Python syntax..."
python3 -m py_compile custom_auth/tenant_fix.py custom_auth/management/commands/fix_tenant_isolation.py

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Python syntax errors found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python syntax OK${NC}"

cd ../..

# Step 2: Commit the changes
echo ""
echo -e "${YELLOW}Step 2: Committing changes...${NC}"

git add backend/pyfactor/custom_auth/tenant_fix.py
git add backend/pyfactor/custom_auth/management/commands/fix_tenant_isolation.py
git add backend/pyfactor/custom_auth/tenant_base_viewset.py
git add backend/pyfactor/inventory/views.py
git add backend/pyfactor/inventory/urls.py
git add backend/pyfactor/inventory/debug_views.py

git status

echo ""
echo -e "${YELLOW}Creating commit...${NC}"
git commit -m "CRITICAL: Fix tenant isolation - users can only see their own data

- Added comprehensive tenant isolation in TenantIsolatedViewSet
- Fixed ProductViewSet and InventoryItemViewSet base querysets
- Added tenant_fix.py to fix orphaned data
- Added management command fix_tenant_isolation
- Added debug endpoint to verify tenant data visibility
- Ensures strict data isolation between tenants
- Fixes issue where support@dottapps.com couldn't see their data

This is a critical security fix for multi-tenant isolation."

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

# Step 4: Monitor deployment
echo ""
echo -e "${YELLOW}Step 4: Deployment will start automatically on Render${NC}"
echo ""
echo "Monitor deployment at:"
echo "  Frontend: https://dashboard.render.com/web/srv-crrltvtsvqrc73fm3b60"
echo "  Backend: https://dashboard.render.com/web/srv-crrltv5svqrc73fm3b5g"
echo ""
echo "After deployment completes (5-10 minutes), run these commands on production:"
echo ""
echo "1. Verify tenant isolation:"
echo "   python manage.py fix_tenant_isolation --verify-only"
echo ""
echo "2. Fix any issues:"
echo "   python manage.py fix_tenant_isolation"
echo ""
echo "3. Verify specific user:"
echo "   python manage.py fix_tenant_isolation --user support@dottapps.com"
echo ""
echo "4. Test the debug endpoint:"
echo "   curl https://api.dottapps.com/api/inventory/debug/tenant-data/"
echo ""
echo -e "${GREEN}=========================================="
echo "DEPLOYMENT INITIATED SUCCESSFULLY!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Wait for deployment to complete (5-10 minutes)"
echo "2. Run the management command on production"
echo "3. Test that support@dottapps.com can see their data"
echo "4. Test that other users still see only their own data"