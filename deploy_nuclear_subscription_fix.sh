#!/bin/bash

# Nuclear subscription fix - clears EVERYTHING
echo "☢️  NUCLEAR SUBSCRIPTION FIX"
echo "========================================"
echo "WARNING: This will force ALL users to re-login!"
echo ""

# Server details
SERVER="root@srv-d0u46u63jp1c73fctmd0-84bbc9ddc7-xr8mr"

# Create the nuclear script on server
cat > /tmp/nuclear_fix.sh << 'SCRIPT_END'
#!/bin/bash
set -e

echo "📦 Pulling latest code..."
cd /app
git pull

echo ""
echo "☢️  Running NUCLEAR cache clear..."
cd /app/backend/pyfactor

# Run the nuclear clear script
python scripts/nuclear_cache_clear.py

echo ""
echo "✅ Nuclear clear complete!"
echo ""
echo "📱 USER MUST NOW:"
echo "   1. LOG OUT completely"
echo "   2. Clear browser cache (Ctrl+Shift+Delete)"
echo "   3. Close browser"
echo "   4. Open browser and log in fresh"
echo ""
SCRIPT_END

# Make executable
chmod +x /tmp/nuclear_fix.sh

echo "📤 Uploading and running nuclear fix on server..."
echo ""

# Copy and execute
scp /tmp/nuclear_fix.sh $SERVER:/tmp/nuclear_fix.sh
ssh $SERVER "bash /tmp/nuclear_fix.sh && rm /tmp/nuclear_fix.sh"

# Clean up
rm /tmp/nuclear_fix.sh

echo ""
echo "========================================"
echo "☢️  NUCLEAR FIX DEPLOYED!"
echo "========================================"
echo ""
echo "IMPORTANT: Tell jubacargovillage@outlook.com to:"
echo "   1. LOG OUT right now"
echo "   2. Clear browser cache (Ctrl+Shift+Delete)"
echo "   3. Close browser completely"
echo "   4. Open browser and log in fresh"
echo ""
echo "The dashboard will show 'Enterprise' after fresh login."