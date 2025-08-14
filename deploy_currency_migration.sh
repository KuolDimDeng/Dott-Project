#!/bin/bash
# Deploy currency migration to production
# This script commits and pushes the migration script, then the production server will run it

echo "=== Deploying Currency Migration to Production ==="
echo ""

# Add and commit the migration script
echo "1. Committing migration script..."
git add backend/pyfactor/scripts/safe_production_currency_migration.py
git commit -m "Add safe production currency migration script

- Safely adds currency_code and currency_symbol columns
- Updates existing South Sudan transactions to use SSP
- Verifies data integrity after migration
- Does not affect existing data"

# Push to main branch for production deployment
echo ""
echo "2. Pushing to production (main branch)..."
git push origin main

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "The migration script has been deployed to production."
echo "It will run automatically on the next deployment."
echo ""
echo "To monitor the deployment:"
echo "1. Check Render dashboard for backend deployment status"
echo "2. Watch the logs for migration output"
echo "3. Once deployed, the POS system should work correctly"
echo ""
echo "If the migration doesn't run automatically, you can:"
echo "1. SSH into the production server"
echo "2. Run: python scripts/safe_production_currency_migration.py"