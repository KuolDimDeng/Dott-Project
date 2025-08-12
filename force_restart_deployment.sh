#!/bin/bash

echo "🚀 Forcing Django Application Restart on Render"
echo "============================================"

# Add a timestamp to force a redeploy
echo "# Deployment timestamp: $(date)" >> backend/pyfactor/pyfactor/settings.py

# Commit and push to trigger deployment
git add -A
git commit -m "Force restart: Fix ViewSet tenant filtering - $(date +%Y%m%d-%H%M%S)

This forces a full restart of the Django application to ensure all ViewSet
changes are properly loaded. The previous deployment fixed critical issues
where ViewSets were not calling super().get_queryset() for tenant filtering.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main

echo "✅ Deployment triggered. Render will restart the application."
echo "⏳ Wait 2-3 minutes for the deployment to complete."
echo ""
echo "Monitor deployment at:"
echo "https://dashboard.render.com/web/srv-cth4m8pu0jms73bm7bl0/deploys"