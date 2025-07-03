#!/bin/bash

echo "🎯 Deploying Smart Insights Chart Display Fix"
echo "============================================"
echo ""
echo "Issue: Claude returns charts in JSON code blocks that display as text"
echo "Fix: Remove JSON code blocks from displayed text while preserving chart data"
echo ""
echo "Changes made:"
echo "1. Modified SmartInsight.js to strip ```json...``` blocks from AI response text"
echo "2. Charts are still parsed and rendered, but JSON is not shown to user"
echo ""

# Commit the changes
echo "📝 Creating commit..."
git add frontend/pyfactor_next/src/app/dashboard/components/forms/SmartInsight.js
git commit -m "fix: Remove JSON code blocks from Smart Insights display text

- Claude returns charts wrapped in ```json blocks for parsing
- These blocks were being displayed as text to the user
- Now strips JSON blocks from display while preserving chart rendering
- Charts render properly and text is clean

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
echo "📋 Result:"
echo "- JSON code blocks will no longer appear in chat responses"
echo "- Charts will render properly below the text"
echo "- Users will see clean, formatted responses with visualizations"
echo ""