#!/bin/bash

echo "Testing Backend Currency API Connectivity"
echo "========================================"

# Backend URL
BACKEND_URL="https://api.dottapps.com"

echo ""
echo "1. Testing backend health endpoint..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "${BACKEND_URL}/api/currency/health" || echo "Failed to connect"

echo ""
echo "2. Testing backend currency preferences endpoint (without auth)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "${BACKEND_URL}/api/currency/preferences" || echo "Failed to connect"

echo ""
echo "3. Testing with verbose output..."
curl -v "${BACKEND_URL}/api/currency/health" 2>&1 | grep -E "< HTTP|< CF-|Connected|Could not resolve|Connection refused|SSL|TLS" | head -20

echo ""
echo "4. Testing DNS resolution..."
nslookup api.dottapps.com || echo "DNS resolution failed"

echo ""
echo "5. Testing direct connection to backend..."
curl -I -m 5 "${BACKEND_URL}" 2>&1 | head -10