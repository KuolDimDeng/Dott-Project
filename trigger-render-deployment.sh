#!/bin/bash

echo "🚀 Triggering Backend Deployment to Render"
echo "========================================"
echo ""

# First, let's make a small change to force a new deployment
echo "Creating a deployment trigger file..."

# Create a timestamp file to trigger deployment
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "Deployment triggered at: $TIMESTAMP" > backend/pyfactor/DEPLOYMENT_TRIGGER.txt
echo "Commit: $(git rev-parse HEAD)" >> backend/pyfactor/DEPLOYMENT_TRIGGER.txt
echo "Branch: $(git branch --show-current)" >> backend/pyfactor/DEPLOYMENT_TRIGGER.txt

# Add and commit the change
git add backend/pyfactor/DEPLOYMENT_TRIGGER.txt
git commit -m "Trigger backend deployment - ensure tenant lookup fix is live

- Forces Render to deploy the latest code including commit 6b885bcc
- Tenant lookup fix converts user.id to string for proper CharField comparison
- Resolves issue where users are redirected to onboarding after completing it"

# Push to trigger deployment
echo ""
echo "Pushing to trigger deployment..."
git push origin Dott_Main_Dev_Deploy

echo ""
echo "✅ Deployment triggered!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://dashboard.render.com/"
echo "2. Watch the deployment progress"
echo "3. Look for 'Deploy live' message"
echo "4. Deployment usually takes 5-10 minutes"
echo ""
echo "🔍 To verify after deployment:"
echo "1. Clear browser cache"
echo "2. Sign in with kdeng@dottapps.com"
echo "3. Should go to dashboard, NOT onboarding"
echo ""
echo "The tenant lookup fix (commit 6b885bcc) will be active after deployment completes."