#!/bin/bash

# Quick script to deploy POS fix to production after staging is verified

echo "================================================"
echo "DEPLOYING POS FIX TO PRODUCTION"
echo "================================================"

cd /Users/kuoldeng/projectx

# Ensure we're up to date
echo "1. Updating local branches..."
git checkout main
git pull origin main
git checkout staging  
git pull origin staging

# Merge staging to main
echo -e "\n2. Merging staging to main..."
git checkout main
git merge staging -m "Fix POS database schema - add missing tenant_id and business_id columns

- Tested in staging environment
- Adds missing columns automatically on startup
- Fixes POS transaction failures"

# Push to production
echo -e "\n3. Pushing to production..."
git push origin main

echo -e "\n================================================"
echo "✅ DEPLOYED TO PRODUCTION!"
echo "================================================"
echo ""
echo "Monitor deployment at:"
echo "https://dashboard.render.com/web/srv-cscbp6qj1k6c738ihorg/deploys"
echo ""
echo "Once deployed, production will automatically:"
echo "1. Run fix_pos_schema.py on startup"
echo "2. Add missing columns to all tables"
echo "3. Fix POS transactions"
echo ""
echo "Production URL: https://dottapps.com"