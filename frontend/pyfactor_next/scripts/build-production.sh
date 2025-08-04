#!/bin/bash
echo "Building for production with Cloudflare + Render..."

# Clean previous builds
rm -rf .next

# Set production environment
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=3584"

# Build with optimizations
echo "Running production build..."
npm run build

# Verify build output
if [ -d ".next" ]; then
  echo "✅ Build successful"
  
  # Check bundle sizes
  echo "Bundle analysis:"
  find .next/static/chunks -name "*.js" -type f -exec ls -lh {} \; | awk '{print $5, $9}' | sort -hr | head -20
else
  echo "❌ Build failed"
  exit 1
fi
