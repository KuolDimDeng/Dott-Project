#!/bin/bash
# Pre-deployment cleanup script to reduce build size and speed up deployments
# This removes unnecessary files before Docker build

echo "🧹 Starting pre-deployment cleanup..."

# Remove .next build cache (3.4GB!)
if [ -d ".next" ]; then
    echo "Removing .next directory..."
    rm -rf .next
fi

# Remove development logs
echo "Removing development logs..."
rm -f dev.log *.log

# Remove temporary files
echo "Removing temporary files..."
rm -f temp.js *.tmp *.temp

# Remove backup directory
if [ -d "backups" ]; then
    echo "Removing backups directory..."
    rm -rf backups
fi

# Remove node_modules if it exists (will be rebuilt in Docker)
if [ -d "node_modules" ]; then
    echo "Removing node_modules..."
    rm -rf node_modules
fi

# Clean npm/pnpm cache
echo "Cleaning package manager cache..."
pnpm store prune 2>/dev/null || true
npm cache clean --force 2>/dev/null || true

# Remove any .DS_Store files
find . -name ".DS_Store" -delete 2>/dev/null || true

# Remove any editor swap files
find . -name "*.swp" -o -name "*.swo" -o -name "*~" -delete 2>/dev/null || true

echo "✅ Cleanup complete! Ready for deployment."
echo ""
echo "📊 Current directory size:"
du -sh .

echo ""
echo "🚀 Next step: Deploy to Render"