#!/bin/bash
# deploy_health_check_fixed.sh
# Deploys the application with fixed health check configuration
# Created: May 16, 2025

set -e

cd "$(dirname "$0")/.."
echo "🔧 Deploying with fixed health check configuration..."

# Run the health check fix script first
python scripts/Version0018_fix_health_check_config.py

# Deploy with the fixed configuration
echo "📦 Deploying to Elastic Beanstalk..."
eb deploy --label health-check-fixed-$(date +%Y%m%d%H%M%S) --staged

echo "✅ Deployment with health check fix complete"
