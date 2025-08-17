#!/bin/bash

# Comprehensive sync script to ensure staging and production are identical
# This addresses the issue where Stripe works in staging but not production

echo "======================================="
echo "Syncing Staging to Production - Complete"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Ensure we're on the right branch
echo -e "${BLUE}Step 1: Checking current branch...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Step 2: Fetch all branches
echo -e "${BLUE}Step 2: Fetching latest from remote...${NC}"
git fetch --all

# Step 3: Show differences between staging and main
echo -e "${BLUE}Step 3: Checking differences between staging and main...${NC}"
echo "Commits in main but not in staging:"
git log --oneline origin/staging..origin/main | head -5

echo ""
echo "Commits in staging but not in main:"
git log --oneline origin/main..origin/staging | head -5

# Step 4: Switch to main and force it to match staging exactly
echo -e "${YELLOW}Step 4: Force syncing main to match staging exactly...${NC}"
git checkout main
git reset --hard origin/staging
echo -e "${GREEN}Main branch now matches staging exactly${NC}"

# Step 5: Push the updated main to remote
echo -e "${BLUE}Step 5: Pushing updated main to remote...${NC}"
git push origin main --force-with-lease

echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}Git Sync Complete!${NC}"
echo -e "${GREEN}=======================================${NC}"

# Step 6: Check environment variables
echo ""
echo -e "${BLUE}Step 6: Environment Variable Checklist${NC}"
echo -e "${YELLOW}Please verify these are set in Render for BOTH services:${NC}"
echo ""
echo "Frontend (dott-front):"
echo "  ✓ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "  ✓ NEXT_PUBLIC_API_URL"
echo "  ✓ NEXT_PUBLIC_AUTH0_DOMAIN"
echo "  ✓ NEXT_PUBLIC_AUTH0_CLIENT_ID"
echo "  ✓ All other NEXT_PUBLIC_* variables"
echo ""
echo "Backend (dott-api):"
echo "  ✓ STRIPE_SECRET_KEY"
echo "  ✓ STRIPE_WEBHOOK_SECRET"
echo "  ✓ STRIPE_EXPRESS_ACCOUNT_ID"
echo "  ✓ Database connection (DATABASE_URL)"
echo ""

# Step 7: Database check suggestions
echo -e "${BLUE}Step 7: Database Checks to Perform${NC}"
echo ""
echo "If Stripe still doesn't work after sync, check these in production DB:"
echo ""
echo "1. Run in production shell:"
echo -e "${YELLOW}python manage.py dbshell${NC}"
echo ""
echo "2. Check if Stripe configuration exists:"
echo -e "${YELLOW}SELECT * FROM django_constance_config WHERE key LIKE '%stripe%';${NC}"
echo ""
echo "3. Check user payment methods:"
echo -e "${YELLOW}SELECT COUNT(*) FROM payments_paymentmethod WHERE provider = 'stripe';${NC}"
echo ""
echo "4. Check business details for Stripe setup:"
echo -e "${YELLOW}SELECT id, stripe_account_id FROM users_business WHERE stripe_account_id IS NOT NULL;${NC}"
echo ""
echo "5. Check for any payment settings:"
echo -e "${YELLOW}SELECT * FROM payments_paymentsettings LIMIT 5;${NC}"
echo ""

# Step 8: Manual deployment steps
echo -e "${BLUE}Step 8: Manual Deployment Steps${NC}"
echo ""
echo -e "${GREEN}For Frontend (dott-front):${NC}"
echo "1. Go to Render Dashboard > dott-front"
echo "2. Click 'Manual Deploy'"
echo "3. Select 'Clear build cache & deploy'"
echo "4. Wait for deployment to complete"
echo ""
echo -e "${GREEN}For Backend (dott-api):${NC}"
echo "1. Go to Render Dashboard > dott-api"
echo "2. Click 'Manual Deploy'"
echo "3. Wait for deployment to complete"
echo ""

# Step 9: Testing steps
echo -e "${BLUE}Step 9: After Deployment Testing${NC}"
echo ""
echo "1. Test Stripe payment at: https://dottapps.com/pos"
echo "2. Open browser console and check for errors"
echo "3. Check /api/runtime-config endpoint"
echo "4. Verify Stripe key is loaded"
echo ""

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}Sync Script Complete!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo "If Stripe still doesn't work after all these steps,"
echo "the issue is likely in the database or environment configuration"
echo "specific to production that differs from staging."