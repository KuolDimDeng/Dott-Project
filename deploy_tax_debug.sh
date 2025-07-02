#!/bin/bash
cd /Users/kuoldeng/projectx

# Add the file
git add frontend/pyfactor_next/src/app/api/taxes/suggestions/route.js

# Commit with message
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
git push origin Dott_Main_Dev_Deploy

echo "Deployment complete!"