#!/bin/bash

echo "🚀 Deploying React error #306 fix for Product Management..."

cd /Users/kuoldeng/projectx

# Add and commit all the changes
echo "📦 Committing Product Management React error fix..."
git add frontend/pyfactor_next/src/app/dashboard/components/forms/ProductManagement.js
git add frontend/pyfactor_next/src/app/dashboard/components/forms/SalesProductManagement.js

git commit -m "Fix React error #306 in Product Management navigation

- Remove memoization from ProductManagement component export
- Memoization was causing issues with lazy loading and React error #306
- Update SalesProductManagement to use dynamic import with Suspense
- Add proper loading states and client-side only rendering
- Match ServiceManagement pattern for consistent behavior

This fixes the 'Unable to load products' error when navigating
back to the Product Management page from other pages."

# Push to main branch
echo "📤 Pushing to main branch..."
git push origin main

echo "✅ Deployment complete! Changes will be live in 2-3 minutes."
echo ""
echo "📊 Monitor deployment at: https://dashboard.render.com/web/srv-cpvjvp3v2p9s73c60k9g"
echo ""
echo "🔄 Summary of fix:"
echo "  • Fixed React error #306 when navigating to Product Management"
echo "  • Removed problematic memoization from component export"
echo "  • Added dynamic import with proper Suspense boundaries"
echo "  • Ensured client-side only rendering for consistency"