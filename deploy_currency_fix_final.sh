#!/bin/bash
set -e

echo "🚀 Deploying Currency Preference Fix to Production"
echo "========================================"
echo ""

# Show what we're fixing
echo "📝 This deployment fixes:"
echo "  1. Routes /api/currency/preferences/ to use enhanced v3 handler"
echo "  2. V3 handler has comprehensive logging and error handling"
echo "  3. Properly handles BusinessDetails fields (not Business fields)"
echo "  4. Auto-detects currency based on country"
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Uncommitted changes detected. Committing them now..."
    git add -A
    git commit -m "Fix currency preference display in production

- Route /api/currency/preferences/ to use v3 handler with comprehensive logging
- V3 handler properly accesses BusinessDetails model fields
- Includes auto-detection based on country
- Adds health check endpoint at /api/currency/health/
- Fixes 500 error that was preventing currency display"
    echo "✅ Changes committed"
fi

# Push to staging first (as per CLAUDE.md requirements)
echo ""
echo "📤 Pushing to staging branch..."
git push origin staging

echo ""
echo "🔄 Merging staging to main for production deployment..."
git checkout main
git pull origin main
git merge staging -m "Merge staging: Fix currency preference API routing"
git push origin main

# Switch back to staging
git checkout staging

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📊 Next Steps:"
echo "  1. Monitor Render deployment at: https://dashboard.render.com"
echo "  2. Test currency display at: https://dottapps.com/dashboard"
echo "  3. Check health endpoint: https://api.dottapps.com/api/currency/health/"
echo ""
echo "🔍 To verify the fix:"
echo "  - Currency should now display in dashboard (SSP for South Sudan, USD for others)"
echo "  - No more 500 errors from /api/currency/preferences/"
echo "  - Comprehensive logs available in Render for debugging"