#!/bin/bash

echo "🔍 Checking deployment status..."
echo "⏰ Timestamp: $(date)"
echo ""

# Check if the backend is responding
BACKEND_URL="https://dott-backend.onrender.com"
HEALTH_ENDPOINT="${BACKEND_URL}/health/"

echo "🌐 Testing backend health endpoint..."
echo "URL: ${HEALTH_ENDPOINT}"
echo ""

# Test the health endpoint
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_ENDPOINT}" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Backend is responding (HTTP $HTTP_STATUS)"
    echo "🎉 Deployment appears successful!"
elif [ "$HTTP_STATUS" = "500" ]; then
    echo "❌ Backend is up but has internal server error (HTTP $HTTP_STATUS)"
    echo "🔧 This suggests the IndentationError is still present"
elif [ "$HTTP_STATUS" = "000" ]; then
    echo "❌ Backend is not responding (connection failed)"
    echo "🚧 Deployment may still be in progress"
else
    echo "⚠️ Backend returned HTTP $HTTP_STATUS"
    echo "🔄 Deployment status unclear"
fi

echo ""
echo "💡 If you're still seeing IndentationError, wait 2-3 minutes for Render to complete the deployment."
echo "💡 Render can take time to pull latest changes and rebuild the container." 