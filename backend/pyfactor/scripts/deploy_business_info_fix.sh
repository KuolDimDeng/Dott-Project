#!/bin/bash

# Script to deploy business info fixes to production
# This fixes the issue where Info tab shows no business information

echo "🚀 Deploying Business Info Fixes..."
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo -e "${RED}Error: manage.py not found. Please run this script from /backend/pyfactor directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Running migrations...${NC}"
python manage.py migrate marketplace --no-input

echo -e "${YELLOW}Step 2: Running sync command in dry-run mode first...${NC}"
python manage.py sync_business_info --dry-run

echo -e "${YELLOW}Step 3: Do you want to proceed with the actual sync? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${GREEN}Running sync command...${NC}"
    python manage.py sync_business_info
else
    echo -e "${YELLOW}Sync skipped. You can run it manually later with:${NC}"
    echo "python manage.py sync_business_info"
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Summary of changes:"
echo "- BusinessListing model now auto-syncs from UserProfile on save"
echo "- Added sync_business_info management command"
echo "- Added /api/marketplace/business/sync_business_info/ endpoint"
echo "- Mobile app now shows fallback values for missing data"
echo ""
echo "Next steps:"
echo "1. Test the Info tab in the mobile app"
echo "2. Business owners can use 'Business Info' menu option to edit their info"
echo "3. The sync will happen automatically for new businesses"