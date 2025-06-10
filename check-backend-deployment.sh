#!/bin/bash

echo "🔍 Checking Backend Deployment Status..."
echo "⏰ Timestamp: $(date)"
echo ""

# Check if the backend is responding
echo "🌐 Testing backend health endpoint..."
BACKEND_URL="https://api.dottapps.com/health/"
echo "URL: $BACKEND_URL"

response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL")
echo ""

if [ "$response" = "200" ]; then
    echo "✅ Backend is responding (HTTP $response)"
    
    # Check git commit info if available
    echo ""
    echo "📦 Checking deployment version..."
    VERSION_URL="https://api.dottapps.com/api/version/"
    version_response=$(curl -s "$VERSION_URL" 2>/dev/null)
    
    if [ ! -z "$version_response" ]; then
        echo "Version info: $version_response"
    else
        echo "ℹ️  No version endpoint available"
    fi
    
    # Check the specific fix
    echo ""
    echo "🔧 To verify the tenant lookup fix is deployed:"
    echo "1. SSH into your Render service"
    echo "2. Run: cd /app/backend/pyfactor && python verify_tenant_fix.py"
    echo ""
    echo "Or check the latest deployment in Render dashboard:"
    echo "https://dashboard.render.com/"
    
elif [ "$response" = "404" ]; then
    echo "⚠️  Backend returned HTTP 404"
    echo "🔄 Deployment status unclear"
else
    echo "❌ Backend is not responding (HTTP $response)"
fi

echo ""
echo "💡 To deploy the latest changes to Render:"
echo "1. Go to https://dashboard.render.com/"
echo "2. Find your backend service"
echo "3. Click 'Manual Deploy' > 'Deploy latest commit'"
echo ""
echo "The latest commit with the fix is:"
echo "Commit: 6b885bcc"
echo "Message: Fix tenant lookup issue - convert user.id to string for CharField comparison"