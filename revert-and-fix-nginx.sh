#!/bin/bash

# Emergency Revert and Nginx Fix
# 1. Revert to working Django version
# 2. Apply nginx configuration separately

set -e
echo "🚨 Emergency Revert and Nginx Fix..."

echo ""
echo "🔄 **STEP 1: Reverting to Working Django Version**"
echo "   Reverting to: vDott-20250523202843 (last known working)"

# Revert to the working Django deployment
aws elasticbeanstalk update-environment \
  --environment-name DottApps-Max-Security-Fixed \
  --version-label "vDott-20250523202843" \
  --region us-east-1

echo "✅ Revert initiated - Django should be restored in 2-3 minutes"

echo ""
echo "⏳ **STEP 2: Wait for Revert to Complete**"
echo "   Please wait for the environment to return to healthy state"
echo "   Monitor: https://console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1"

echo ""
echo "🔧 **STEP 3: Once Reverted, Apply Nginx Fix**"
echo ""
echo "After revert completes, we'll need to:"
echo "1. Extract the working Django deployment"
echo "2. Add nginx configuration to it"  
echo "3. Redeploy with both Django + nginx fix"

echo ""
echo "📊 **Current Status:**"
echo "   • Django deployment: Reverting to working version"
echo "   • Health checks: Should improve once revert completes"
echo "   • ALB: Will continue getting 404s until nginx fix applied"

echo ""
echo "🎯 **Next Steps (run after revert completes):**"
echo "   1. Verify Django is working: curl http://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"
echo "   2. Download and modify the working version"
echo "   3. Apply nginx configuration overlay" 