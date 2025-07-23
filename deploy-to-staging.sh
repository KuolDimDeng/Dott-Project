#!/bin/bash
# Deploy to Staging Environment

echo "🚀 Deploying to STAGING environment..."

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Ensure we're on staging branch
if [ "$CURRENT_BRANCH" != "staging" ]; then
    echo "📝 Switching to staging branch..."
    git checkout staging || { echo "❌ Failed to switch to staging branch"; exit 1; }
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin staging

# Push to trigger deployment
echo "🚀 Pushing to staging..."
git push origin staging

echo "✅ Deployment triggered!"
echo "📊 Monitor deployment at:"
echo "   Frontend: https://dashboard.render.com/web/srv-XXXXX"
echo "   Backend: https://dashboard.render.com/web/srv-XXXXX"
echo ""
echo "🌐 Staging URLs:"
echo "   Frontend: https://dott-staging.onrender.com"
echo "   Backend: https://dott-api-staging.onrender.com"