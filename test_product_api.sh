#!/bin/bash

# Test the backend products API directly
echo "Testing backend products API..."
echo "================================"

# First get a session from the frontend
FRONTEND_URL="https://www.dottapps.com"
BACKEND_URL="https://api.dottapps.com"

# Use the support user's session ID from the logs
SESSION_ID="916da04a-173e-4d28-8c2d-0a7db2d6cde8"

echo "Using session: $SESSION_ID"
echo ""

# Call the backend API directly
echo "Calling backend API: $BACKEND_URL/api/inventory/products/"
curl -s -H "Authorization: Session $SESSION_ID" \
     -H "Content-Type: application/json" \
     "$BACKEND_URL/api/inventory/products/" | python -m json.tool | head -100

echo ""
echo "================================"
echo "Key observations:"
echo "Check if response contains 'quantity' or 'stock_quantity' field"