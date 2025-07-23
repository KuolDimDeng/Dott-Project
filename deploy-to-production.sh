#!/bin/bash
# Deploy to Production Environment

echo "🚀 Deploying to PRODUCTION environment..."
echo "⚠️  This will deploy to your LIVE production environment!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Ensure we're on main branch
echo "📝 Switching to main branch..."
git checkout main || { echo "❌ Failed to switch to main branch"; exit 1; }

# Merge staging into main
echo "🔀 Merging staging into main..."
git merge staging -m "Deploy from staging to production" || { echo "❌ Merge failed"; exit 1; }

# Push to trigger deployment
echo "🚀 Pushing to production..."
git push origin main || { echo "❌ Push failed"; exit 1; }

# Create deployment tag
TAG="deploy-$(date +%Y%m%d-%H%M%S)"
git tag -a "$TAG" -m "Production deployment"
git push origin "$TAG"

echo "✅ Production deployment triggered!"
echo "🏷️  Tagged as: $TAG"
echo ""
echo "📊 Monitor deployment at:"
echo "   Frontend: https://dashboard.render.com/web/srv-XXXXX"
echo "   Backend: https://dashboard.render.com/web/srv-XXXXX"
echo ""
echo "🌐 Production URLs:"
echo "   Frontend: https://dottapps.com"
echo "   Backend: https://api.dottapps.com"