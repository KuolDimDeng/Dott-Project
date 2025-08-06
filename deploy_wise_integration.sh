#!/bin/bash
# Deploy Wise banking integration to production

echo "🚀 Deploying Wise Banking Integration..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "backend/pyfactor/manage.py" ]; then
    echo -e "${RED}Error: Not in project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking git status...${NC}"
git status --short

echo -e "${YELLOW}Step 2: Adding all changes...${NC}"
git add .

echo -e "${YELLOW}Step 3: Committing changes...${NC}"
git commit -m "Add Wise banking integration with secure Stripe storage

- Secure bank details storage in Stripe Connect
- Only last 4 digits stored locally
- Wise API integration for international transfers
- Automatic settlement processing via webhooks
- Daily settlement cron job
- Banking settings UI for non-Plaid countries
- Fee calculation: Stripe (2.9% + $0.30) + Platform (0.1% + $0.30)
- User pays Wise transfer fees

Co-Authored-By: Claude <noreply@anthropic.com>"

echo -e "${YELLOW}Step 4: Pushing to main branch...${NC}"
git push origin main

echo -e "${GREEN}✅ Code pushed to GitHub${NC}"

echo -e "${YELLOW}Step 5: Render will auto-deploy from main branch${NC}"
echo "Monitor deployment at: https://dashboard.render.com/web/srv-d0u46u63jp1c73fctmd0"

echo -e "${YELLOW}Step 6: After deployment completes, run migrations:${NC}"
echo "1. Go to Render dashboard"
echo "2. Open Shell tab"
echo "3. Run: python manage.py migrate"

echo -e "${YELLOW}Step 7: Configure Stripe webhook in dashboard:${NC}"
echo "1. Go to https://dashboard.stripe.com/webhooks"
echo "2. Add endpoint: https://api.dottapps.com/api/payments/webhooks/stripe/pos-settlements/"
echo "3. Select events:"
echo "   - payment_intent.succeeded"
echo "   - charge.succeeded"
echo "4. Copy webhook secret and add to Render env vars as STRIPE_WEBHOOK_SECRET"
echo "   Note: This is specifically for POS sales settlements, not tax filing"

echo -e "${YELLOW}Step 8: Set up cron job in Render:${NC}"
echo "1. Go to Jobs tab in Render"
echo "2. Create new cron job:"
echo "   - Command: python manage.py process_settlements"
echo "   - Schedule: 0 2 * * * (2 AM daily)"

echo -e "${GREEN}✅ Deployment script completed!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Wait for Render deployment to complete (~5-10 minutes)"
echo "2. Run migrations in Render shell"
echo "3. Test banking setup at: https://app.dottapps.com/Settings/banking"
echo "4. Verify Wise API credentials are set in Render env vars"