#!/bin/bash

echo "🚀 Forcing deployment of POS fixes to production..."

cd /Users/kuoldeng/projectx

# Make a trivial change to force redeployment
echo "# Deployment trigger: $(date)" >> frontend/pyfactor_next/.deployment-trigger

git add frontend/pyfactor_next/.deployment-trigger
git commit -m "Force deployment: POS fixes for stock quantity and tenant_id - $(date +%Y%m%d-%H%M%S)"
git push origin main

echo "
✅ Deployment triggered!

The following fixes will be deployed:
1. Stock quantity check fix in POSSystemInline.js
2. Django management command: fix_journal_entry_tenant

After deployment completes (3-5 minutes), run this on the backend:
python manage.py fix_journal_entry_tenant

Monitor deployment at:
https://dashboard.render.com/
"