#!/bin/bash

echo "🔄 Deploying currency fix to staging..."
echo ""

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete (60 seconds)..."
sleep 60

echo ""
echo "📝 Instructions to fix existing transactions:"
echo "1. Go to Render Dashboard"
echo "2. Open the 'dott-api' service"
echo "3. Go to the 'Shell' tab"
echo "4. Run these commands:"
echo ""
echo "   cd /app"
echo "   python scripts/fix_existing_transaction_currencies.py"
echo ""
echo "This will update all existing transactions to use the correct currency from BusinessSettings."
echo ""
echo "✅ New transactions will automatically use the correct currency going forward."
echo ""
echo "🎯 The fix includes:"
echo "  - Frontend sends currency with each sale"
echo "  - API route passes currency to backend"
echo "  - Backend saves transactions with correct currency"
echo "  - Transactions display shows the saved currency"