#!/bin/bash

echo "🚀 Deploying product management fixes to production..."

cd /Users/kuoldeng/projectx

# Add and commit all the changes
echo "📦 Committing all product management fixes..."
git add frontend/pyfactor_next/src/app/dashboard/components/forms/ProductManagement.js
git add frontend/pyfactor_next/src/app/dashboard/components/forms/SalesProductManagement.js
git add frontend/pyfactor_next/src/app/dashboard/components/pos/POSSystemInline.js
git add backend/pyfactor/finance/migrations/0003_add_tenant_id_to_journalentry.py

git commit -m "Fix multiple product management issues

- Fix React error #306 by handling null returns properly
- Create proper SalesProductManagement wrapper component
- Fix product activate/deactivate API endpoint URL
- Add Time & Weight pricing display with calculated prices
- Show pricing breakdown in product details
- Add dynamic pricing support in POS with user notifications
- Set default stock quantity to 1 instead of 0
- Add placeholder text to indicate default stock value
- Fix missing tenant_id column in finance_journalentry table

This ensures Time & Weight pricing is properly calculated and displayed
throughout the system, and prevents accidental zero-stock products."

# Push to main branch
echo "📤 Pushing to main branch..."
git push origin main

echo "✅ Deployment complete! Changes will be live in 2-3 minutes."
echo ""
echo "📊 Monitor deployment at: https://dashboard.render.com/web/srv-cpvjvp3v2p9s73c60k9g"
echo ""
echo "🔄 Summary of fixes deployed:"
echo "  • Fixed React error when navigating back to Product Management"
echo "  • Fixed product activate/deactivate functionality"
echo "  • Added Time & Weight pricing calculations"
echo "  • Set default stock quantity to 1"
echo "  • Fixed POS tenant_id error for journal entries"