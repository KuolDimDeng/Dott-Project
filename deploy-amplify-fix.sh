#!/bin/bash

echo "🔧 Deploying Amplify Configuration Fix..."

# Check if we're in the project directory
if [ ! -d "frontend/pyfactor_next" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

cd frontend/pyfactor_next

echo "🧹 Cleaning npm cache and node_modules..."
rm -rf node_modules package-lock.json
npm cache clean --force

echo "📦 Installing dependencies..."
npm install

echo "🧪 Testing configuration..."
# Test the build process
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the configuration."
    exit 1
fi

echo "🚀 Deploying to Vercel..."
# Use the correct project settings
npx vercel --prod --cwd .

echo "✅ Deployment complete!"
echo ""
echo "🧪 Test your authentication now:"
echo "1. Go to https://www.dottapps.com/auth/signup"
echo "2. Try creating an account"
echo "3. Check browser console for improved network error handling"
echo ""
echo "📊 Key improvements made:"
echo "• Fixed Hub import for AWS Amplify v6"
echo "• Added HTTPS enforcement for AWS Cognito"
echo "• Implemented exponential backoff retry logic"
echo "• Enhanced timeout settings (30 seconds)"
echo "• Added domain-specific cookie configuration"
echo "• Improved error logging and diagnostics" 