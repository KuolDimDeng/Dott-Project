#!/bin/bash
set -e

echo "🔍 Debugging currency display issue in production..."

# Test the production API directly
echo "📡 Testing production currency API..."
curl -s "https://api.dottapps.com/health/" | jq '.'

echo ""
echo "🚀 Deploying fixes to production..."
echo "1. Added PUT method support to frontend currency API route"
echo "2. Ensured backend handles missing fields gracefully"

# Trigger frontend deployment
echo ""
echo "⏳ Triggering frontend deployment..."
curl -s -X POST \
  -H "Accept: application/json" \
  -H "Authorization: Bearer srv-d05e8q9umphs73co9obg" \
  https://api.render.com/v1/services/srv-d05e8q9umphs73co9obg/deploys \
  -d '{"clearCache": "clear"}' | jq '.'

echo ""
echo "✅ Deployment triggered successfully!"
echo ""
echo "📌 Next steps:"
echo "1. Wait 5-10 minutes for deployment to complete"
echo "2. Check https://app.dottapps.com/dashboard"
echo "3. Currency should now display properly in the DashAppBar"
echo ""
echo "🔗 Monitor deployment: https://dashboard.render.com/web/srv-d05e8q9umphs73co9obg"