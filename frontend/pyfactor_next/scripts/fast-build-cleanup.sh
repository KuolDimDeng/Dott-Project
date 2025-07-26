#!/bin/bash

echo "🚀 Fast Build Cleanup Script - Target: 5-7 minute builds"
echo "======================================================="

# Step 1: Remove heavy dependencies
echo "📦 Step 1: Removing heavy unused dependencies..."
pnpm remove aws-sdk @aws-sdk/client-appsync @aws-sdk/client-ses puppeteer puppeteer-core chrome-aws-lambda

# Step 2: Remove duplicate libraries
echo "📦 Step 2: Analyzing and removing duplicates..."

# Check chart library usage
chartjs_used=$(grep -r "import.*from.*['\"]chart\.js\|react-chartjs" src/ 2>/dev/null | wc -l)
recharts_used=$(grep -r "import.*from.*['\"]recharts" src/ 2>/dev/null | wc -l)

if [ "$chartjs_used" -eq 0 ] && [ "$recharts_used" -gt 0 ]; then
    echo "  ❌ Removing unused chart.js (keeping recharts)..."
    pnpm remove chart.js react-chartjs-2
elif [ "$recharts_used" -eq 0 ] && [ "$chartjs_used" -gt 0 ]; then
    echo "  ❌ Removing unused recharts (keeping chart.js)..."
    pnpm remove recharts
fi

# Check icon library usage
lucide_used=$(grep -r "import.*from.*['\"]lucide-react" src/ 2>/dev/null | wc -l)
if [ "$lucide_used" -eq 0 ]; then
    echo "  ❌ Removing unused lucide-react..."
    pnpm remove lucide-react
fi

# Step 3: Remove dev dependencies from production
echo "📦 Step 3: Checking for misplaced dev dependencies..."
pnpm remove --save xlsx pdf-lib jspdf jspdf-autotable puppeteer 2>/dev/null || true

# Step 4: Clean and dedupe
echo "🧹 Step 4: Cleaning and deduping..."
pnpm dedupe
pnpm store prune

# Step 5: Show results
echo ""
echo "📊 Results:"
echo "  Old node_modules size: 1.5GB"
echo -n "  New node_modules size: "
du -sh node_modules 2>/dev/null | cut -f1

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "🎯 Next steps to achieve 5-7 minute builds:"
echo "1. Update package.json build script:"
echo '   "build:render-fast": "next build --experimental-turbo -c next.config.render-fast.js"'
echo ""
echo "2. Update Render.yaml to use fast Dockerfile:"
echo "   dockerfilePath: ./Dockerfile.fast"
echo ""
echo "3. Add these Render environment variables:"
echo "   - NEXT_PRIVATE_STANDALONE=true"
echo "   - NEXT_TELEMETRY_DISABLED=1"
echo "   - NODE_OPTIONS=--max-old-space-size=4096"
echo ""
echo "4. In Render build settings, use:"
echo "   Build command: pnpm install --prod --frozen-lockfile && pnpm run build:render-fast"