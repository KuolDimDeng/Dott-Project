#!/bin/bash
set -e

echo "Starting deployment process..."
cd /Users/kuoldeng/projectx

# Add the file
echo "Adding tax suggestions API file..."
git add frontend/pyfactor_next/src/app/api/taxes/suggestions/route.js

# Create commit
echo "Creating commit..."
git commit -m "Add comprehensive debugging to tax suggestions API

- Log input data (country, state, city, business type)
- Log Anthropic client initialization status
- Log full prompt being sent to Claude
- Log complete Claude response
- Log extracted JSON string before parsing
- Enhanced error logging for parse failures
- Add warning when fallback data is used

This will help diagnose why tax rates aren't being returned properly.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to deploy
echo "Pushing to origin..."
git push origin Dott_Main_Dev_Deploy

echo "Deployment complete! Check Render dashboard for deployment status."