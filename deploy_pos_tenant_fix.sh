#!/bin/bash

echo "🚀 Deploying POS tenant_id fix to production..."

cd /Users/kuoldeng/projectx

# Add and commit the changes
echo "📦 Committing migration file..."
git add backend/pyfactor/finance/migrations/0003_add_tenant_id_to_journalentry.py
git commit -m "Fix POS: Add missing tenant_id column to finance_journalentry table

- Created migration to add tenant_id field to JournalEntry model
- This fixes the POS sale completion error 'column tenant_id does not exist'
- JournalEntry already inherits from TenantAwareModel but column was missing"

# Push to main branch
echo "📤 Pushing to main branch..."
git push origin main

echo "✅ Code deployed! The migration will run automatically on Render."
echo "⏳ Please wait 2-3 minutes for deployment to complete."
echo ""
echo "📊 Monitor deployment at: https://dashboard.render.com/web/srv-cpvjvp3v2p9s73c60k9g"