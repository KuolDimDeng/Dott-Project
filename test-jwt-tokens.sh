#!/bin/bash

echo "🔍 Testing JWT Token Generation..."
echo "================================="

# Test backend authentication endpoint
echo "📋 Testing backend authentication..."
BACKEND_RESPONSE=$(curl -s "https://api.dottapps.com/api/users/me/")
echo "Backend response: $BACKEND_RESPONSE"

if [[ "$BACKEND_RESPONSE" == *"Auth0 authentication required"* ]]; then
    echo "✅ Backend is correctly requiring authentication"
else
    echo "⚠️  Unexpected backend response"
fi

# Test frontend accessibility  
echo ""
echo "📋 Testing frontend accessibility..."
FRONTEND_STATUS=$(curl -s -I "https://dottapps.com/" | grep "HTTP" | awk '{print $2}')
echo "Frontend status: $FRONTEND_STATUS"

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend is accessible!"
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "1. Go to https://dottapps.com/auth/login"
    echo "2. Login with Auth0"
    echo "3. Check browser console for JWT token confirmation"
    echo "4. Monitor backend logs for JWT validation (not JWE errors)"
    echo ""
    echo "🔍 BACKEND LOG MONITORING:"
    echo "Watch Render logs for:"
    echo "  ✅ SUCCESS: 'alg': 'RS256' (JWT tokens)"
    echo "  ❌ FAILURE: 'alg': 'dir', 'enc': 'A256GCM' (JWE tokens)"
    
elif [ "$FRONTEND_STATUS" = "429" ]; then
    echo "⏳ Frontend still blocked by security checkpoint"
    echo "   Try again in a few minutes..."
else
    echo "⚠️  Unexpected frontend status: $FRONTEND_STATUS"
fi 