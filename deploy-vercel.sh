#!/bin/bash

# Deploy to Vercel Script
# Usage: ./deploy-vercel.sh [environment]
# Environment options: production, preview (default: production)

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
PROJECT_NAME="dottapps-oauth-fixed"

echo "🚀 Starting Vercel deployment..."
echo "📁 Project: $PROJECT_NAME"
echo "🎯 Environment: $ENVIRONMENT"
echo "📅 Timestamp: $(date)"

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
  # Check if we need to change to frontend directory
  if [ -f "frontend/pyfactor_next/vercel.json" ]; then
    echo "📂 Changing to frontend directory..."
    cd frontend/pyfactor_next
  else
    echo "❌ Error: vercel.json not found in current directory or frontend/pyfactor_next/"
    exit 1
  fi
fi

# Verify Vercel CLI is installed
if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ Error: Vercel CLI not found"
  echo "💡 Install with: npm install -g vercel"
  exit 1
fi

# Get current git branch and commit
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "🌳 Branch: $BRANCH"
echo "📝 Commit: $COMMIT"

# Build the deployment command
if [ "$ENVIRONMENT" = "production" ]; then
  DEPLOY_CMD="vercel deploy --prod --yes"
  echo "🎯 Deploying to PRODUCTION..."
else
  DEPLOY_CMD="vercel deploy --yes"
  echo "🔍 Deploying to PREVIEW..."
fi

# Execute deployment
echo "⚡ Executing: $DEPLOY_CMD"
echo "---"

$DEPLOY_CMD

echo "---"
echo "✅ Deployment completed!"
echo "🔗 Check deployment status at: https://vercel.com/dashboard"
echo "🌐 Project URL: https://dottapps.com"

# Log deployment for tracking
echo "$(date): Deployed $BRANCH ($COMMIT) to $ENVIRONMENT" >> deployment.log 