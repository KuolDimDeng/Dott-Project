#!/bin/bash

echo "========================================"
echo "Deploying POS AccountCategory Fix"
echo "========================================"

cd /Users/kuoldeng/projectx

# First, add and commit the fix script
echo "Adding constraint fix script..."
git add backend/pyfactor/scripts/fix_accountcategory_constraint.py
git add deploy_pos_constraint_fix.sh
git commit -m "Add emergency script to fix AccountCategory constraint issue

- Removes old global unique constraint on code field
- Ensures per-tenant constraint exists
- Fixes POS sale completion error"

# Push to main
echo "Pushing to main branch..."
git push origin main

echo ""
echo "========================================"
echo "Fix Script Deployed!"
echo "========================================"
echo ""
echo "IMPORTANT: The constraint fix script has been deployed."
echo ""
echo "To complete the fix, you need to run this command on Render:"
echo ""
echo "  python manage.py shell < scripts/fix_accountcategory_constraint.py"
echo ""
echo "Or via Render dashboard:"
echo "1. Go to your Render dashboard"
echo "2. Open the dott-api service"
echo "3. Go to the 'Shell' tab"
echo "4. Run: python manage.py shell < scripts/fix_accountcategory_constraint.py"
echo ""
echo "This will:"
echo "- Remove the old global unique constraint"
echo "- Ensure the per-tenant constraint exists"
echo "- Fix the POS sale completion error"