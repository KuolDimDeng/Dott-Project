#!/bin/bash

# Deploy POS Default Bank Account Feature
# This adds the ability for users to designate a default bank account for POS settlements

echo "================================================"
echo "Deploying POS Default Bank Account Feature"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Commit changes to staging
echo -e "${YELLOW}Step 1: Committing changes to staging branch...${NC}"
cd /Users/kuoldeng/projectx

git add -A
git commit -m "Add POS default bank account selection feature

- Added is_default_for_pos field to WiseItem model
- Created migration 0009_wise_default_pos_account.py
- Updated cron job to use WiseItem.get_default_pos_account()
- Added API endpoints for managing POS default accounts
- Updated Banking Settings UI to show/set POS default
- Industry standard: Settings-based account selection (not POS-based)

This allows users to designate which bank account receives POS settlements,
following industry standards like Square, Stripe, and Shopify."

git push origin staging

echo -e "${GREEN}✓ Changes committed to staging${NC}"
echo ""

# Step 2: Deploy to staging
echo -e "${YELLOW}Step 2: Deploying to staging environment...${NC}"
echo "Staging will automatically deploy from the staging branch"
echo ""

# Step 3: Run migrations on staging
echo -e "${YELLOW}Step 3: Instructions for running migrations on staging:${NC}"
echo "1. SSH into staging server or use Render Shell"
echo "2. Run: python manage.py migrate banking"
echo "3. Verify migration: python manage.py showmigrations banking"
echo ""

# Step 4: Test on staging
echo -e "${YELLOW}Step 4: Testing checklist for staging:${NC}"
echo "[ ] Go to Settings → Banking & Payments"
echo "[ ] Add a bank account if not already present"
echo "[ ] Click 'Set POS Default' button on desired account"
echo "[ ] Verify green 'POS Default' badge appears"
echo "[ ] Make a test POS payment with credit card"
echo "[ ] Check that settlement uses the default account"
echo ""

# Step 5: Production deployment checklist
echo -e "${YELLOW}Step 5: Production deployment (after testing):${NC}"
echo "1. Merge staging to main: git push origin staging:main"
echo "2. Production will auto-deploy from main branch"
echo "3. Run migrations on production: python manage.py migrate banking"
echo "4. Monitor logs for any issues"
echo ""

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Feature Summary:${NC}"
echo "• Users can set a default bank account for POS in Settings → Banking"
echo "• Only verified, active accounts can be set as default"
echo "• Cron job automatically uses the default account for settlements"
echo "• If no default set, first active account is used (and auto-set as default)"
echo "• Follows industry standards (Square, Stripe, Shopify)"
echo -e "${GREEN}================================================${NC}"

echo ""
echo -e "${YELLOW}Important Notes:${NC}"
echo "• Only OWNER and ADMIN roles can change POS default settings"
echo "• Bank account must be verified before setting as default"
echo "• The cron job runs daily at 2 AM UTC"
echo "• Minimum settlement amount is $10"
echo ""

echo "Deployment script completed!"