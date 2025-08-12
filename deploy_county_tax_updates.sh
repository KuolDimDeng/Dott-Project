#!/bin/bash
# Deploy county tax updates

echo "=== Deploying County Tax Updates ==="
echo "Date: $(date)"
echo ""

# Trigger backend deployment
echo "1. Triggering backend deployment..."
cd /Users/kuoldeng/projectx/backend/pyfactor
git add -A
git commit -m "Add county-level tax rates for Utah and update all US state rates

- Updated all US state sales tax rates to 2025 values
- Added county-level tax rates for all 29 Utah counties
- Added sales-tax API endpoint to GlobalTaxRateViewSet
- Added counties API endpoint to TenantTaxSettingsViewSet
- Added locality fields to TenantTaxSettings model
- Fixed South Dakota rate from 4.5% to 4.2%
- Fixed Utah base rate from 6.1% to 4.85%
- Fixed Virginia rate from 5.3% to 4.3%
- Fixed New Mexico rate from 5.13% to 4.88%

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main

# Trigger frontend deployment
echo ""
echo "2. Triggering frontend deployment..."
cd /Users/kuoldeng/projectx/frontend/pyfactor_next
git add -A
git commit -m "Add county dropdown to Tax Settings UI

- Added county selection dropdown that appears when state is selected
- Updated tax rates API to support county parameter
- Created counties API route for fetching available counties
- Added loading state for county dropdown
- Show helpful message for Utah indicating county-specific rates
- County selection automatically updates tax rate

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main

echo ""
echo "=== Deployment Triggered ==="
echo "Backend: Check https://dashboard.render.com for deployment status"
echo "Frontend: Check https://dashboard.render.com for deployment status"
echo ""
echo "Test after deployment:"
echo "1. Go to Settings > Tax Settings"
echo "2. Click 'Edit Sales Tax'"
echo "3. Select Utah as state"
echo "4. County dropdown should appear"
echo "5. Select different counties to see rates change"
echo ""
echo "Utah County Rates:"
echo "- Salt Lake County: 7.75%"
echo "- Summit County: 8.85% (highest)"
echo "- Utah County: 7.25%"
echo "- State base rate: 4.85%"