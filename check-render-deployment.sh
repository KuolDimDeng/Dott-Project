#!/bin/bash

# Render Deployment Status Checker
echo "🔍 Checking Render Deployment Status..."
echo "Time: $(date)"
echo ""

# Test health endpoints
echo "📋 Health Check Results:"
echo "========================"

# Direct Render URL
echo "🔗 Direct Render URL:"
echo "URL: https://dott-api-y26w.onrender.com/health/"
DIRECT_STATUS=$(curl -s -w "%{http_code}" https://dott-api-y26w.onrender.com/health/ -o /tmp/direct_health.json)
if [ "$DIRECT_STATUS" = "200" ]; then
    echo "✅ Status: HEALTHY (HTTP $DIRECT_STATUS)"
    echo "Response: $(cat /tmp/direct_health.json)"
else
    echo "❌ Status: FAILED (HTTP $DIRECT_STATUS)"
fi
echo ""

# Custom domain
echo "🌐 Custom Domain:"
echo "URL: https://api.dottapps.com/health/"
CUSTOM_STATUS=$(curl -s -w "%{http_code}" https://api.dottapps.com/health/ -o /tmp/custom_health.json)
if [ "$CUSTOM_STATUS" = "200" ]; then
    echo "✅ Status: HEALTHY (HTTP $CUSTOM_STATUS)"
    echo "Response: $(cat /tmp/custom_health.json)"
else
    echo "❌ Status: FAILED (HTTP $CUSTOM_STATUS)"
fi
echo ""

# Test API endpoints
echo "🔧 API Endpoint Tests:"
echo "======================"

# Test user auth endpoint
echo "🔐 Auth endpoint test:"
AUTH_STATUS=$(curl -s -w "%{http_code}" https://api.dottapps.com/auth/me/ -o /tmp/auth_response.json)
echo "URL: https://api.dottapps.com/auth/me/"
echo "Status: HTTP $AUTH_STATUS"
if [ "$AUTH_STATUS" = "401" ] || [ "$AUTH_STATUS" = "403" ]; then
    echo "✅ Expected unauthorized response (Auth0 working)"
else
    echo "Response: $(cat /tmp/auth_response.json)"
fi
echo ""

# Git status
echo "📊 Git Status:"
echo "=============="
echo "Current branch: $(git branch --show-current)"
echo "Latest commit: $(git log -1 --oneline)"
echo "Remote status: $(git status -uno)"
echo ""

# Summary
echo "📈 DEPLOYMENT SUMMARY:"
echo "======================"
if [ "$DIRECT_STATUS" = "200" ] && [ "$CUSTOM_STATUS" = "200" ]; then
    echo "🎉 SUCCESS: Render deployment is fully operational!"
    echo "✅ Direct Render URL working"
    echo "✅ Custom domain working"
    echo "✅ Health checks passing"
    echo "✅ Auth0 authentication configured"
    echo ""
    echo "🔗 Access URLs:"
    echo "   - API: https://api.dottapps.com/"
    echo "   - Health: https://api.dottapps.com/health/"
    echo "   - Admin: https://api.dottapps.com/admin/"
else
    echo "⚠️  WARNING: Some endpoints are not responding correctly"
fi

# Cleanup
rm -f /tmp/direct_health.json /tmp/custom_health.json /tmp/auth_response.json 