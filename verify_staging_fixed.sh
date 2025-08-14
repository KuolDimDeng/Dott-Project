#!/bin/bash

echo "================================================"
echo "VERIFYING STAGING POS FIX"
echo "================================================"

# Simple test - try to access the POS page
echo -e "\n1. Testing if POS page loads in staging..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.dottapps.com/pos)

if [ "$STATUS" == "200" ]; then
    echo "   ✅ POS page loads successfully"
else
    echo "   ⚠️  POS page returned status: $STATUS"
fi

echo -e "\n2. To manually test:"
echo "   a. Go to https://staging.dottapps.com"
echo "   b. Login with test account"
echo "   c. Navigate to POS"
echo "   d. Try to complete a sale"
echo ""
echo "3. If POS works in staging, deploy to production:"
echo "   cd /Users/kuoldeng/projectx"
echo "   git checkout main"
echo "   git merge staging -m 'Fix POS database schema'"
echo "   git push origin main"