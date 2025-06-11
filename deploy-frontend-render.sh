#!/bin/bash

echo "🚀 Deploying frontend to Render..."

# Navigate to frontend directory
cd frontend/pyfactor_next

# Check if middleware.js exists and rename it
if [ -f "middleware.js" ]; then
    echo "⚠️  Disabling middleware.js for Render deployment..."
    mv middleware.js middleware.js.disabled
fi

# Stage changes
cd ../..
git add .

# Create commit message
COMMIT_MSG="Deploy frontend to Render with middleware fix"

# Commit changes
git commit -m "$COMMIT_MSG" || echo "No changes to commit"

# Push to the branch
echo "📤 Pushing to Dott_Main_Dev_Deploy branch..."
git push origin Dott_Main_Dev_Deploy

echo "✅ Deployment initiated! Check Render dashboard for build progress."
echo "🔗 Make sure to set these environment variables in Render:"
echo "   - NEXT_PUBLIC_API_URL=https://api.dottapps.com"
echo "   - NEXT_PUBLIC_BASE_URL=https://[your-render-url]"
echo "   - NEXT_PUBLIC_AUTH0_DOMAIN=auth.dottapps.com"
echo "   - All other Auth0 variables from your .env file"