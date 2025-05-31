#!/bin/bash

echo "🧹 CloudFront Cleanup - Removing Unused Frontend Distribution"
echo "============================================================"

FRONTEND_DIST_ID="E2BYTRL6S1FNTF"
API_DIST_ID="E1NYAUSVFSRF1D"

echo "📊 Current Status:"
echo "✅ KEEP: $API_DIST_ID (api.dottapps.com) - Your working API"
echo "❌ DELETE: $FRONTEND_DIST_ID (dottapps.com) - Unused, served by Vercel"
echo ""

echo "🔍 Verifying frontend is served by Vercel..."
FRONTEND_SERVER=$(curl -s -I https://dottapps.com | grep -i server | head -1)
echo "Frontend server: $FRONTEND_SERVER"

if [[ $FRONTEND_SERVER == *"Vercel"* ]]; then
    echo "✅ Confirmed: Frontend is served by Vercel, CloudFront distribution is unused"
    echo ""
    
    echo "💰 Cost savings by deleting unused distribution: ~$10-25/month"
    echo ""
    
    echo "🛑 To safely delete the frontend CloudFront distribution:"
    echo "1. First disable the distribution (takes 15-20 minutes)"
    echo "2. Then delete it (takes a few minutes)"
    echo ""
    
    read -p "Do you want to disable the unused frontend distribution? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Disabling CloudFront distribution $FRONTEND_DIST_ID..."
        
        # Get current distribution config
        aws cloudfront get-distribution-config --id $FRONTEND_DIST_ID --region us-east-1 > /tmp/dist-config.json
        
        # Extract ETag
        ETAG=$(jq -r '.ETag' /tmp/dist-config.json)
        
        # Modify config to disable
        jq '.DistributionConfig.Enabled = false' /tmp/dist-config.json > /tmp/dist-config-disabled.json
        
        # Update distribution
        aws cloudfront update-distribution \
            --id $FRONTEND_DIST_ID \
            --if-match $ETAG \
            --distribution-config file:///tmp/dist-config-disabled.json \
            --region us-east-1
            
        echo "✅ Distribution $FRONTEND_DIST_ID is now being disabled"
        echo "⏳ This will take 15-20 minutes to complete"
        echo ""
        echo "📋 Next steps:"
        echo "1. Wait for distribution to show 'Disabled' status"
        echo "2. Run: aws cloudfront delete-distribution --id $FRONTEND_DIST_ID --if-match [NEW_ETAG]"
        echo ""
        echo "🎯 Final result: Only your API CloudFront ($API_DIST_ID) will remain"
        
        # Cleanup temp files
        rm -f /tmp/dist-config.json /tmp/dist-config-disabled.json
    else
        echo "❌ Skipped disabling distribution"
    fi
else
    echo "⚠️  Frontend server check inconclusive. Please verify manually."
fi

echo ""
echo "📊 Summary:"
echo "✅ KEEPING: $API_DIST_ID (api.dottapps.com) - Essential for your backend API"
echo "❌ REMOVING: $FRONTEND_DIST_ID (dottapps.com) - Unused, frontend served by Vercel" 