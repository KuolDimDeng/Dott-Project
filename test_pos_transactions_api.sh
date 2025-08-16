#!/bin/bash

# Test POS transactions API to see what's being returned
echo "Testing POS Transactions API..."

# Get session cookie from staging
SID="b163da3b-f751-4cd7-9829-f5ac0952c13b"

# Call the backend directly
echo "Calling backend API directly..."
curl -s -X GET "https://api.dottapps.com/api/sales/pos/transactions/" \
  -H "Cookie: sid=$SID" \
  -H "Content-Type: application/json" | python3 -m json.tool | head -100

echo ""
echo "First transaction details:"
curl -s -X GET "https://api.dottapps.com/api/sales/pos/transactions/" \
  -H "Cookie: sid=$SID" \
  -H "Content-Type: application/json" | python3 -c "
import json
import sys
data = json.load(sys.stdin)
if 'results' in data and len(data['results']) > 0:
    first = data['results'][0]
    print(f\"Transaction: {first.get('transaction_number', 'N/A')}\")
    print(f\"Currency Code: {first.get('currency_code', 'NOT PRESENT')}\")
    print(f\"Currency Symbol: {first.get('currency_symbol', 'NOT PRESENT')}\")
    print(f\"Total Amount: {first.get('total_amount', 'N/A')}\")
    print(f\"All fields: {list(first.keys())}\")
else:
    print('No results found')
"