#!/bin/bash

echo "🚀 Creating new Vercel project with correct OAuth settings..."

# Navigate to the frontend directory
cd frontend/pyfactor_next

# Remove any existing Vercel configuration
rm -rf .vercel

# Create a proper vercel.json in the frontend directory
cat > vercel.json << 'EOF'
{
  "version": 2,
  "name": "dottapps-oauth-enhanced",
  "buildCommand": "pnpm run build:production",
  "framework": "nextjs",
  "installCommand": "pnpm install --frozen-lockfile",
  "env": {
    "ENABLE_EXPERIMENTAL_COREPACK": "1",
    "NEXT_PUBLIC_AWS_REGION": "us-east-1",
    "NEXT_PUBLIC_COGNITO_USER_POOL_ID": "us-east-1_JPL8vGfb6",
    "NEXT_PUBLIC_COGNITO_CLIENT_ID": "1o5v84mrgn4gt87khtr179uc5b",
    "NEXT_PUBLIC_COGNITO_DOMAIN": "us-east-1jpl8vgfb6",
    "NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN": "https://dottapps.com/auth/callback",
    "NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT": "https://dottapps.com/auth/signin",
    "NEXT_PUBLIC_OAUTH_SCOPES": "openid,profile,email",
    "NODE_ENV": "production"
  },
  "functions": {
    "src/app/**/*.js": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"]
}
EOF

echo "✅ Created vercel.json with correct settings"

# Initialize new Vercel project
echo "🔧 Initializing new Vercel project..."
echo "When prompted:"
echo "  - Set up and deploy: Y"
echo "  - Which scope: Select your account"
echo "  - Link to existing project: N"
echo "  - Project name: dottapps-oauth-enhanced"
echo "  - Directory: ./ (current directory)"

npx vercel --prod

echo "🎉 Deployment complete!"
echo "📋 Next steps:"
echo "  1. Copy the new Vercel URL"
echo "  2. Update your domain settings to point dottapps.com to the new project"
echo "  3. Test OAuth authentication" 