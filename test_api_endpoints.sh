#!/bin/bash

echo "============================================"
echo "TESTING API ENDPOINTS DIRECTLY"
echo "============================================"
echo ""

# Base URL
API_BASE="https://api.dottapps.com"

# Test each endpoint
echo "Testing Products endpoint:"
curl -s "$API_BASE/api/inventory/products/" | python3 -m json.tool | head -20
echo ""

echo "Testing Services endpoint:"
curl -s "$API_BASE/api/inventory/services/" | python3 -m json.tool | head -20
echo ""

echo "Testing Customers endpoint:"
curl -s "$API_BASE/api/crm/customers/" | python3 -m json.tool | head -20
echo ""

echo "Testing Invoices endpoint:"
curl -s "$API_BASE/api/sales/invoices/" | python3 -m json.tool | head -20
echo ""

echo "Testing Suppliers endpoint:"
curl -s "$API_BASE/api/inventory/suppliers/" | python3 -m json.tool | head -20
echo ""

echo "============================================"
echo "CHECKING FRONTEND URLS"
echo "============================================"
echo ""

echo "Checking what the frontend is actually calling:"
echo ""

# Check the compiled JavaScript to see what URLs are being used
echo "Searching for API URLs in frontend build:"
if [ -d "/Users/kuoldeng/projectx/frontend/pyfactor_next/.next" ]; then
    echo "Found .next build directory"
    grep -r "api/services\|api/invoices\|api/customers" /Users/kuoldeng/projectx/frontend/pyfactor_next/.next/static 2>/dev/null | head -5
else
    echo ".next build directory not found - frontend may need rebuilding"
fi

echo ""
echo "============================================"
echo "DEPLOYMENT STATUS"
echo "============================================"
echo ""

# Check last commit
echo "Last deployed commit:"
git log -1 --oneline

echo ""
echo "Deployment should complete in 2-3 minutes after push."
echo "Monitor at: https://dashboard.render.com/web/srv-cth4m8pu0jms73bm7bl0/deploys"