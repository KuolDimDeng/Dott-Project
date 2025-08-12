#!/bin/bash

echo "🧪 Currency API Test Script"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if Next.js API is reachable
echo "1️⃣ Testing Next.js Currency API (OPTIONS)..."
curl -X OPTIONS http://localhost:3000/api/currency/preferences -H "Accept: application/json" -w "\nStatus: %{http_code}\n"
echo ""

# Test 2: Check Django backend health
echo "2️⃣ Testing Django Currency Health Check..."
curl -X GET https://api.dottapps.com/api/currency/health -H "Accept: application/json" -w "\nStatus: %{http_code}\n"
echo ""

# Test 3: Check if backend is running
echo "3️⃣ Testing Backend API Status..."
curl -X GET https://api.dottapps.com/health/ -w "\nStatus: %{http_code}\n"
echo ""

# Test 4: Test authenticated endpoint (will fail without session)
echo "4️⃣ Testing Currency Preferences (without auth - should fail)..."
curl -X GET http://localhost:3000/api/currency/preferences -H "Accept: application/json" -w "\nStatus: %{http_code}\n"
echo ""

echo "✅ Test complete!"
echo ""
echo "Expected results:"
echo "- Test 1: Status 200 (API is reachable)"
echo "- Test 2: Status 200 (Backend health check)"
echo "- Test 3: Status 200 (Backend is running)"
echo "- Test 4: Status 401 (Authentication required)"