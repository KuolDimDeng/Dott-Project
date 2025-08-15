#!/bin/bash

echo "🚀 Deploying BusinessSettings fix to staging..."
echo ""

# Add and commit the fix scripts
echo "📝 Committing fix scripts..."
git add backend/pyfactor/scripts/fix_business_settings_simple.py
git add backend/pyfactor/scripts/diagnose_tenant_ids_safe.py
git commit -m "Add simplified BusinessSettings fix for existing users

- Handles empty and invalid tenant_id values
- Creates proper UUIDs for each user
- Auto-detects currency based on country
- Special handling for South Sudan users
- Uses raw SQL to bypass Django ORM validation issues"

# Push to staging
echo "🔄 Pushing to staging branch..."
git push origin staging

echo ""
echo "⏳ Waiting for deployment to complete (60 seconds)..."
sleep 60

echo ""
echo "==============================================="
echo "📋 INSTRUCTIONS TO FIX EXISTING USERS:"
echo "==============================================="
echo ""
echo "1. Go to Render Dashboard: https://dashboard.render.com"
echo "2. Open the 'dott-api' service (staging)"
echo "3. Click on the 'Shell' tab"
echo "4. Run these commands:"
echo ""
echo "   cd /app"
echo "   "
echo "   # First, run the diagnostic to understand the data:"
echo "   python scripts/diagnose_tenant_ids_safe.py"
echo "   "
echo "   # Then fix all users:"
echo "   python scripts/fix_business_settings_simple.py"
echo ""
echo "==============================================="
echo "✅ WHAT THIS FIX DOES:"
echo "==============================================="
echo "  • Creates BusinessSettings for all existing users"
echo "  • Generates proper UUIDs for users with invalid tenant_ids"
echo "  • Auto-detects currency based on country"
echo "  • Sets SSP currency for South Sudan users"
echo "  • Updates user tenant_ids to proper UUIDs"
echo ""
echo "==============================================="
echo "🎯 RESULT:"
echo "==============================================="
echo "  • All users will have BusinessSettings"
echo "  • POS transactions will display correct currency"
echo "  • New users automatically get BusinessSettings during onboarding"
echo ""
echo "Ready to proceed? Follow the instructions above."
echo ""