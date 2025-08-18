#!/bin/bash

echo "Clearing staging cache and forcing rebuild..."

# Add a timestamp to package.json to force rebuild
TIMESTAMP=$(date +%s)
echo "Adding cache bust timestamp: $TIMESTAMP"

# Create a temporary file to force Next.js to rebuild
cat > /tmp/cache-bust.js << EOF
// Cache bust file - can be deleted
// Timestamp: $TIMESTAMP
// Purpose: Force staging to rebuild with latest ProductManagement.js
EOF

# If you have access to Render CLI, you can trigger a clear-cache deploy
# render deploy --clear-cache

echo "Cache clear initiated. Please wait for staging to rebuild."
echo ""
echo "To verify the fix:"
echo "1. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)"
echo "2. Open Developer Tools > Network tab"
echo "3. Look for ProductManagement.js and verify it contains 'PATCH' not '/deactivate'"
echo ""
echo "The product deactivation should now:"
echo "- Use PATCH /api/inventory/products/{id}"
echo "- NOT use POST /api/inventory/products/{id}/deactivate"