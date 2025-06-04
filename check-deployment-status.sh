#!/bin/bash

echo "🔍 Monitoring Vercel Security Checkpoint Status..."
echo "======================================================="

while true; do
    # Check frontend status
    FRONTEND_STATUS=$(curl -s -I "https://dottapps.com/" | grep "HTTP" | awk '{print $2}')
    
    # Check backend status  
    BACKEND_STATUS=$(curl -s -I "https://api.dottapps.com/health/" | grep "HTTP" | awk '{print $2}')
    
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$TIMESTAMP] Frontend: $FRONTEND_STATUS | Backend: $BACKEND_STATUS"
    
    if [ "$FRONTEND_STATUS" = "200" ]; then
        echo ""
        echo "🎉 SUCCESS! Vercel security checkpoint has cleared!"
        echo "🚀 Frontend is now accessible at https://dottapps.com/"
        echo ""
        echo "Ready to test Auth0 authentication flow:"
        echo "1. Go to https://dottapps.com/auth/login"
        echo "2. Login with Auth0"
        echo "3. Verify no duplicate tenant creation"
        echo "4. Check backend logs for JWT validation success"
        break
    fi
    
    if [ "$FRONTEND_STATUS" = "429" ]; then
        echo "    ⏳ Security checkpoint still active, waiting..."
    else
        echo "    ⚠️  Unexpected status: $FRONTEND_STATUS"
    fi
    
    sleep 30
done 