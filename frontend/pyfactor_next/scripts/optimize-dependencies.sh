#!/bin/bash

echo "🚀 Starting dependency optimization..."

# Remove AWS SDK and related packages
echo "📦 Removing AWS dependencies..."
pnpm remove aws-sdk @aws-sdk/client-appsync @aws-sdk/client-ses

# Remove puppeteer if not used in production
echo "📦 Checking puppeteer usage..."
if ! grep -r "puppeteer" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules"; then
    echo "❌ Puppeteer not used in src/, removing..."
    pnpm remove puppeteer
else
    echo "⚠️  Puppeteer is used in source code, keeping it"
fi

# Check for duplicate icon libraries
echo "🔍 Checking icon library usage..."
heroicons_count=$(grep -r "@heroicons/react" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
phosphor_count=$(grep -r "@phosphor-icons/react" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
lucide_count=$(grep -r "lucide-react" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)

echo "Icon usage: Heroicons=$heroicons_count, Phosphor=$phosphor_count, Lucide=$lucide_count"

# Check for duplicate chart libraries
echo "🔍 Checking chart library usage..."
chartjs_count=$(grep -r "chart.js\|react-chartjs" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
recharts_count=$(grep -r "recharts" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)

echo "Chart usage: Chart.js=$chartjs_count, Recharts=$recharts_count"

# Clean pnpm store
echo "🧹 Cleaning pnpm store..."
pnpm store prune

# Check final size
echo "📊 Final node_modules size:"
du -sh node_modules

echo "✅ Optimization complete! Run 'pnpm install' to ensure everything is properly linked."