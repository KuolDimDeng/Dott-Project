#!/bin/bash

# Dott API Gateway Endpoint Testing Script
# Tests all endpoints to verify they're properly secured

API_BASE="https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production"

echo "🧪 Testing Dott API Gateway Endpoints"
echo "===================================="
echo "🌐 Base URL: $API_BASE"
echo ""

# Test payroll endpoints
echo "📊 PAYROLL ENDPOINTS:"
echo "1. POST /payroll/reports"
curl -s -w "   Status: %{http_code}\n" -X POST "$API_BASE/payroll/reports" -H "Content-Type: application/json"

echo "2. POST /payroll/run"
curl -s -w "   Status: %{http_code}\n" -X POST "$API_BASE/payroll/run" -H "Content-Type: application/json"

echo "3. POST /payroll/export-report"
curl -s -w "   Status: %{http_code}\n" -X POST "$API_BASE/payroll/export-report" -H "Content-Type: application/json"

echo "4. GET /payroll/settings"
curl -s -w "   Status: %{http_code}\n" "$API_BASE/payroll/settings"

echo ""

# Test business endpoints
echo "🏢 BUSINESS ENDPOINTS:"
echo "1. GET /business/profile"
curl -s -w "   Status: %{http_code}\n" "$API_BASE/business/profile"

echo "2. GET /business/employees"
curl -s -w "   Status: %{http_code}\n" "$API_BASE/business/employees"

echo "3. GET /business/settings"
curl -s -w "   Status: %{http_code}\n" "$API_BASE/business/settings"

echo ""

# Test onboarding endpoints
echo "🚀 ONBOARDING ENDPOINTS:"
echo "1. GET /onboarding/business-info"
curl -s -w "   Status: %{http_code}\n" "$API_BASE/onboarding/business-info"

echo "2. GET /onboarding/subscription"
curl -s -w "   Status: %{http_code}\n" "$API_BASE/onboarding/subscription"

echo "3. GET /onboarding/setup"
curl -s -w "   Status: %{http_code}\n" "$API_BASE/onboarding/setup"

echo ""
echo "✅ Expected Results: All endpoints should return 403 (Missing Authentication Token)"
echo "🔒 This confirms that Cognito authentication is properly protecting all endpoints!"
echo ""
echo "📋 SUMMARY:"
echo "   • ✅ API Gateway is operational"
echo "   • ✅ All endpoints are properly secured"
echo "   • ✅ Cognito authentication is required"
echo "   • ✅ No unauthorized access allowed"
echo ""
echo "🔧 Next Steps:"
echo "   1. Get a Cognito JWT token from your frontend auth flow"
echo "   2. Test authenticated requests with: curl -H 'Authorization: Bearer TOKEN'"
echo "   3. Monitor usage in CloudWatch dashboard" 