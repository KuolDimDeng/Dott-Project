#!/bin/bash

# Set OAuth environment variables for local development
# This script fixes the "oauth param not configured" error

echo "🔧 Setting OAuth environment variables for local development..."

export NEXT_PUBLIC_AWS_REGION=us-east-1
export NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_JPL8vGfb6
export NEXT_PUBLIC_COGNITO_CLIENT_ID=1o5v84mrgn4gt87khtr179uc5b
export NEXT_PUBLIC_COGNITO_DOMAIN=us-east-1jpl8vgfb6

# OAuth Configuration for Google Sign-In (Local Development)
export NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback
export NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=http://localhost:3000/auth/signin
export NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid

echo "✅ OAuth environment variables set:"
echo "   COGNITO_DOMAIN: $NEXT_PUBLIC_COGNITO_DOMAIN"
echo "   OAUTH_REDIRECT_SIGN_IN: $NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN"
echo "   OAUTH_REDIRECT_SIGN_OUT: $NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT"
echo "   OAUTH_SCOPES: $NEXT_PUBLIC_OAUTH_SCOPES"
echo ""
echo "🚀 Now run: npm run dev"
echo ""
echo "📝 To use this script:"
echo "   source scripts/set-oauth-env.sh && npm run dev" 