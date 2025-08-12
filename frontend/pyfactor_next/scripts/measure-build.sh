#!/bin/bash

echo "🚀 Build Performance Measurement Tool"
echo "===================================="
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Record start time
START_TIME=$(date +%s)
echo "⏱️  Starting build at $(date)"
echo ""

# Run the build
echo "🏗️  Running optimized build..."
NODE_ENV=production \
NODE_OPTIONS="--max-old-space-size=4096" \
NEXT_TELEMETRY_DISABLED=1 \
NEXT_PRIVATE_BUILD_WORKER=true \
pnpm next build

BUILD_EXIT_CODE=$?

# Record end time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "📊 Build Results:"
echo "================"

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ Build Status: SUCCESS"
else
    echo "❌ Build Status: FAILED (exit code: $BUILD_EXIT_CODE)"
fi

echo "⏱️  Build Duration: ${MINUTES}m ${SECONDS}s"
echo ""

# Analyze build output
if [ -d ".next" ]; then
    echo "📦 Build Size Analysis:"
    echo "======================"
    
    # Total .next size
    NEXT_SIZE=$(du -sh .next | cut -f1)
    echo "Total .next folder: $NEXT_SIZE"
    
    # Static pages
    STATIC_COUNT=$(find .next/server/app -name "*.html" 2>/dev/null | wc -l)
    echo "Static pages generated: $STATIC_COUNT"
    
    # Server chunks
    if [ -d ".next/server/chunks" ]; then
        SERVER_SIZE=$(du -sh .next/server/chunks | cut -f1)
        echo "Server chunks: $SERVER_SIZE"
    fi
    
    # Client chunks
    if [ -d ".next/static/chunks" ]; then
        CLIENT_SIZE=$(du -sh .next/static/chunks | cut -f1)
        echo "Client chunks: $CLIENT_SIZE"
        
        # Find largest chunks
        echo ""
        echo "🔝 Largest client chunks:"
        find .next/static/chunks -name "*.js" -type f -exec ls -lh {} \; | sort -k5 -hr | head -5 | awk '{print "   " $9 ": " $5}'
    fi
fi

echo ""
echo "💡 Optimization Tips:"
echo "===================="

if [ $MINUTES -gt 7 ]; then
    echo "⚠️  Build time exceeds 7 minutes target"
    echo "   - Check for unnecessary dependencies"
    echo "   - Enable more pages for static generation"
    echo "   - Use dynamic imports for heavy components"
elif [ $MINUTES -lt 5 ]; then
    echo "🎉 Excellent! Build time is under 5 minutes"
else
    echo "✅ Good! Build time is within 5-7 minute target"
fi

# Check for cache usage
if [ -d "node_modules/.cache" ]; then
    CACHE_SIZE=$(du -sh node_modules/.cache 2>/dev/null | cut -f1)
    echo ""
    echo "📂 Cache usage: $CACHE_SIZE"
fi

echo ""
echo "🏁 Build measurement complete!"