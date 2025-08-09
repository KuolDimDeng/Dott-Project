#!/bin/bash

echo "Testing Production Cash Flow Endpoint"
echo "======================================"

# You'll need to get your session cookie from the browser
echo "1. Open your browser and go to dottapps.com"
echo "2. Open Developer Tools (F12)"
echo "3. Go to Application/Storage -> Cookies"
echo "4. Find the 'sid' cookie value"
echo ""
read -p "Enter your sid cookie value: " SID

if [ -z "$SID" ]; then
    echo "No session ID provided"
    exit 1
fi

echo ""
echo "Testing endpoint with your session..."
echo ""

# Test the backend endpoint directly
curl -s -H "Cookie: sid=$SID" \
     -H "Authorization: Session $SID" \
     https://api.dottapps.com/api/analysis/cash-flow-data | python3 -m json.tool

echo ""
echo "======================================"
echo "If you see cash_flow_data with values, the backend is working!"
echo "If it shows 0 values, the business_id filter might not be matching."