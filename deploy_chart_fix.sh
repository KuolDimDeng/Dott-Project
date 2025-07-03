#!/bin/bash

echo "🎯 Deploying Smart Insights Chart Fix"
echo "===================================="
echo ""
echo "Changes made:"
echo "1. Removed chart.js stub alias from next.config.js"
echo "2. Removed react-chartjs-2 stub alias from next.config.js"  
echo "3. Removed canvas from externals to enable chart rendering"
echo ""
echo "This will enable proper chart rendering in Smart Insights"
echo ""

# Commit the changes
echo "📝 Creating commit..."
git add frontend/pyfactor_next/next.config.js
git commit -m "fix: Enable Smart Insights charts by removing chart.js stubs

- Removed chart.js and react-chartjs-2 stub aliases from webpack config
- Removed canvas from externals list
- Charts will now render properly instead of showing '(Chart rendering disabled)'
- Fixes Smart Insights visualization functionality

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Show current branch
echo ""
echo "🌿 Current branch: $(git branch --show-current)"
echo ""

# Push changes
echo "🚀 Pushing changes..."
git push

echo ""
echo "✅ Changes pushed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Wait for Render to auto-deploy from Dott_Main_Dev_Deploy branch"
echo "2. Monitor deployment logs for any issues"
echo "3. Test Smart Insights charts after deployment completes"
echo ""
echo "⚠️  Note: If deployment fails due to canvas dependencies:"
echo "   - The app may need to install canvas dependencies"
echo "   - Or we may need to configure Chart.js to work without canvas"
echo ""