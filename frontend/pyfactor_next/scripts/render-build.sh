#!/bin/bash
# Render build script that injects environment variables at build time

echo "🚀 Starting Render build process..."

# Export all NEXT_PUBLIC_ environment variables for the build
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}"
export NEXT_PUBLIC_BASE_URL="${NEXT_PUBLIC_BASE_URL}"
export NEXT_PUBLIC_POSTHOG_KEY="${NEXT_PUBLIC_POSTHOG_KEY}"
export NEXT_PUBLIC_POSTHOG_HOST="${NEXT_PUBLIC_POSTHOG_HOST}"
export NEXT_PUBLIC_AUTH0_DOMAIN="${NEXT_PUBLIC_AUTH0_DOMAIN}"
export NEXT_PUBLIC_AUTH0_CLIENT_ID="${NEXT_PUBLIC_AUTH0_CLIENT_ID}"
export NEXT_PUBLIC_AUTH0_AUDIENCE="${NEXT_PUBLIC_AUTH0_AUDIENCE}"
export NEXT_PUBLIC_CRISP_WEBSITE_ID="${NEXT_PUBLIC_CRISP_WEBSITE_ID}"
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}"
export NEXT_PUBLIC_PLAID_ENV="${NEXT_PUBLIC_PLAID_ENV}"

# Debug: Show which NEXT_PUBLIC vars are set (without values)
echo "📋 Available NEXT_PUBLIC environment variables:"
env | grep "^NEXT_PUBLIC_" | cut -d'=' -f1

# Run the build
echo "🔨 Running pnpm build:render..."
pnpm run build:render

echo "✅ Build completed!"