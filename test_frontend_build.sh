#!/bin/bash

echo "🚀 Testing frontend build locally..."
echo "===================================="

cd /Users/kuoldeng/projectx/frontend/pyfactor_next

# First check for any remaining useSession imports
echo "1. Checking for incorrect useSession imports..."
WRONG_IMPORTS=$(grep -r "from '@/hooks/useSession'" src/ | grep -v "useSession-v2" | grep "\.js:" | wc -l)

if [ $WRONG_IMPORTS -gt 0 ]; then
    echo "❌ Found $WRONG_IMPORTS files with incorrect imports:"
    grep -r "from '@/hooks/useSession'" src/ | grep -v "useSession-v2" | grep "\.js:"
else
    echo "✅ All useSession imports are correct"
fi

# Run the build
echo -e "\n2. Running Next.js build..."
NODE_ENV=production NODE_OPTIONS="--max-old-space-size=4096" pnpm run build

if [ $? -eq 0 ]; then
    echo -e "\n✅ Build completed successfully!"
else
    echo -e "\n❌ Build failed!"
    exit 1
fi