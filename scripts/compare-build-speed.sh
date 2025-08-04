#!/bin/bash

# 🚀 Build Speed Comparison Script
# Compares build times before and after optimizations

echo "🚀 BUILD SPEED COMPARISON"
echo "========================"

cd /Users/kuoldeng/projectx/frontend/pyfactor_next

echo ""
echo "📊 TESTING CURRENT BUILD CONFIGURATION..."
echo "========================================"

# Test current build
START_TIME=$(date +%s)
NODE_OPTIONS="--max-old-space-size=3072" timeout 600 pnpm build > /tmp/build-current.log 2>&1
CURRENT_EXIT_CODE=$?
END_TIME=$(date +%s)
CURRENT_DURATION=$((END_TIME - START_TIME))

if [ $CURRENT_EXIT_CODE -eq 0 ]; then
    echo "✅ Current build: SUCCESS in ${CURRENT_DURATION}s"
else
    echo "❌ Current build: FAILED after ${CURRENT_DURATION}s"
fi

# Clean build artifacts
rm -rf .next

echo ""
echo "📊 TESTING OPTIMIZED BUILD CONFIGURATION..."
echo "=========================================="

# Backup current config
mv next.config.js next.config.backup.js
cp next.config.optimized.js next.config.js

# Test optimized build
START_TIME=$(date +%s)
NODE_OPTIONS="--max-old-space-size=2048" timeout 600 pnpm build > /tmp/build-optimized.log 2>&1
OPTIMIZED_EXIT_CODE=$?
END_TIME=$(date +%s)
OPTIMIZED_DURATION=$((END_TIME - START_TIME))

if [ $OPTIMIZED_EXIT_CODE -eq 0 ]; then
    echo "✅ Optimized build: SUCCESS in ${OPTIMIZED_DURATION}s"
else
    echo "❌ Optimized build: FAILED after ${OPTIMIZED_DURATION}s"
fi

# Restore original config
mv next.config.backup.js next.config.js

echo ""
echo "📊 BUILD SPEED RESULTS"
echo "====================="

# Calculate improvement
if [ $CURRENT_EXIT_CODE -eq 0 ] && [ $OPTIMIZED_EXIT_CODE -eq 0 ]; then
    IMPROVEMENT=$((CURRENT_DURATION - OPTIMIZED_DURATION))
    PERCENTAGE=$((IMPROVEMENT * 100 / CURRENT_DURATION))
    
    echo "Current build time:    ${CURRENT_DURATION}s"
    echo "Optimized build time:  ${OPTIMIZED_DURATION}s"
    echo "Time saved:            ${IMPROVEMENT}s"
    echo "Speed improvement:     ${PERCENTAGE}%"
    
    # Check bundle sizes
    echo ""
    echo "📦 BUNDLE SIZE COMPARISON"
    echo "========================"
    
    if [ -f .next/BUILD_MANIFEST.json ]; then
        echo "Bundle sizes available in .next directory"
    fi
else
    echo "⚠️  Could not compare - one or both builds failed"
fi

echo ""
echo "💡 OPTIMIZATION TECHNIQUES USED:"
echo "================================"
echo "✅ SWC minification (faster than Terser)"
echo "✅ Parallel processing (4 CPU cores)"
echo "✅ Modular imports (tree-shaking)"
echo "✅ Optimized chunk splitting"
echo "✅ Filesystem caching"
echo "✅ Disabled source maps"
echo "✅ Skip ESLint/TypeScript in build"
echo "✅ Domain-based code splitting"

echo ""
echo "🎯 RECOMMENDED NEXT STEPS:"
echo "========================="
echo "1. Use optimized config for production builds"
echo "2. Enable Turbopack for development (experimental)"
echo "3. Consider build caching with Turborepo"
echo "4. Use CDN for static assets"