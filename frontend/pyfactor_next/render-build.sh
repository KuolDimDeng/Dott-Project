#!/bin/bash
# Render build script with Stripe configuration

# Export Stripe publishable key for build
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-pk_test_51RI9epFls6i75mQBc3JI8lpcOUnaMlYAGmbDgOrIylbAqUaCOG035DlZFz35vneimME1QmdSiFiObsv3kcnCSNFi000AABL5EU}"

# Log the configuration (without showing full key)
echo "🔧 Stripe Configuration:"
if [ -n "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then
  echo "  ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set (${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:0:20}...)"
else
  echo "  ❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing!"
fi

# Install dependencies
pnpm install --frozen-lockfile

# Build the application
pnpm build

echo "✅ Build completed successfully"