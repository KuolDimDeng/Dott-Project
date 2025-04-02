#!/bin/bash

echo "=========================================="
echo "💥 NEXT.JS RESET AND RESTART SCRIPT 💥"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in the project root directory!"
  echo "Please run this script from the frontend/pyfactor_next directory"
  exit 1
fi

echo "🧹 Cleaning Next.js cache..."
if [ -d ".next/cache" ]; then
  rm -rf .next/cache
  echo "  ✅ Removed .next/cache"
else
  echo "  ℹ️ Cache directory not found, already clean"
fi

echo "🧹 Cleaning stale Next.js build artifacts..."
if [ -d ".next" ]; then
  echo "  🗑️ Removing stale JavaScript chunks..."
  find .next -name "*.js" -type f -delete
  
  echo "  🗑️ Removing page caches..."
  find .next -name "pages" -type d -exec rm -rf {} \; 2>/dev/null || true
  
  echo "  🗑️ Removing server cache..."
  find .next -name "server" -type d -exec rm -rf {} \; 2>/dev/null || true
  
  echo "  ✅ Next.js build artifacts cleaned"
else
  echo "  ℹ️ No .next directory found, already clean"
fi

echo "🧹 Cleaning pnpm store..."
pnpm store prune
echo "  ✅ pnpm store cleaned"

echo "🧹 Cleaning node_modules cache..."
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "  ✅ Removed node_modules/.cache"
else
  echo "  ℹ️ No node_modules cache found"
fi

echo "🔄 Restarting Next.js development server..."
echo "----------------------------------------"
echo "🚀 Starting with debug flags enabled"
echo "----------------------------------------"
echo ""

DEBUG=pyfactor:* pnpm run dev

echo "----------------------------------------"
echo "✅ Development server exited"
echo "----------------------------------------" 