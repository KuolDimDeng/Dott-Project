#!/bin/bash

# Automated subscription fix deployment script
# This script will SSH into the server and run all commands automatically

echo "🚀 AUTOMATED SUBSCRIPTION FIX DEPLOYMENT"
echo "========================================"
echo ""

# Server details
SERVER="root@srv-d0u46u63jp1c73fctmd0-84bbc9ddc7-xr8mr"

# Create a temporary script to run on the server
cat > /tmp/fix_subscription.sh << 'SCRIPT_END'
#!/bin/bash
set -e

echo "📦 Pulling latest code..."
cd /app
git pull

echo ""
echo "🔧 Running subscription update..."
cd /app/backend/pyfactor

# Run the force update script
python scripts/force_subscription_update.py

echo ""
echo "✅ Subscription update complete!"
echo ""
echo "📱 IMPORTANT: User must now:"
echo "   1. Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to clear browser cache"
echo "   2. OR log out and log back in"
echo ""
SCRIPT_END

# Make the script executable
chmod +x /tmp/fix_subscription.sh

echo "📤 Uploading and running fix on server..."
echo ""

# Copy script to server and execute it
scp /tmp/fix_subscription.sh $SERVER:/tmp/fix_subscription.sh
ssh $SERVER "bash /tmp/fix_subscription.sh && rm /tmp/fix_subscription.sh"

# Clean up local temp file
rm /tmp/fix_subscription.sh

echo ""
echo "========================================" 
echo "🎉 DEPLOYMENT COMPLETE!"
echo "========================================" 
echo ""
echo "The subscription has been updated to ENTERPRISE."
echo ""
echo "👤 User Action Required:"
echo "   Tell jubacargovillage@outlook.com to:"
echo "   1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   2. OR log out and log back in"
echo ""
echo "The dashboard should now show 'Enterprise' instead of 'Free'"