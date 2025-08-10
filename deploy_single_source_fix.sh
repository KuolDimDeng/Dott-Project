#!/bin/bash

# Single Source of Truth Subscription Fix
echo "🎯 SINGLE SOURCE OF TRUTH SUBSCRIPTION FIX"
echo "========================================"
echo ""

# Server details
SERVER="root@srv-d0u46u63jp1c73fctmd0-84bbc9ddc7-xr8mr"

# Create script to run on server
cat > /tmp/single_source_fix.sh << 'SCRIPT_END'
#!/bin/bash
set -e

echo "📦 Pulling latest code..."
cd /app
git pull

echo ""
echo "🔧 Running single source subscription fix..."
cd /app/backend/pyfactor

# Run the fix script
python scripts/fix_subscription_single_source.py

echo ""
echo "✅ Single source fix complete!"
echo ""
echo "📱 USER ACTION REQUIRED:"
echo "   1. Clear browser cache (Ctrl+Shift+R)"
echo "   2. Or log out and log back in"
echo ""
SCRIPT_END

# Make executable
chmod +x /tmp/single_source_fix.sh

echo "📤 Uploading and running fix on server..."
echo ""

# Copy and execute
scp /tmp/single_source_fix.sh $SERVER:/tmp/single_source_fix.sh
ssh $SERVER "bash /tmp/single_source_fix.sh && rm /tmp/single_source_fix.sh"

# Clean up
rm /tmp/single_source_fix.sh

echo ""
echo "========================================"
echo "🎯 SINGLE SOURCE FIX DEPLOYED!"
echo "========================================"
echo ""
echo "The subscription is now using a SINGLE SOURCE OF TRUTH:"
echo "  - Backend: SubscriptionService.get_subscription_plan()"
echo "  - Frontend: sessionData.subscription_plan only"
echo ""
echo "Tell jubacargovillage@outlook.com to:"
echo "  1. Clear browser cache (Ctrl+Shift+R)"
echo "  2. Or log out and log back in"
echo ""
echo "The dashboard will show 'Enterprise' from the single source."