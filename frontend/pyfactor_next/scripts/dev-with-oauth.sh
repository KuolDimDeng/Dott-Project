#!/bin/bash

# Development script with OAuth environment variables
# This script fixes the "oauth param not configured" error

echo "🔧 Starting development server with OAuth configuration..."

# Set OAuth environment variables
export NEXT_PUBLIC_AWS_REGION=us-east-1
export NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_JPL8vGfb6
export NEXT_PUBLIC_COGNITO_CLIENT_ID=1o5v84mrgn4gt87khtr179uc5b
export NEXT_PUBLIC_COGNITO_DOMAIN=us-east-1jpl8vgfb6

# OAuth Configuration for Google Sign-In (Local Development)
export NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback
export NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=http://localhost:3000/auth/signin
export NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid

echo "✅ OAuth environment variables configured"
echo "🚀 Starting Next.js development server..."

# Start the development server
npm run dev 