#!/bin/bash
# Render build script that injects environment variables at build time

echo "🚀 Starting Render build process..."

# Debug: Show all environment variables at build time
echo "📋 All environment variables available:"
env | sort

# Debug: Show which NEXT_PUBLIC vars are set (with partial values for debugging)
echo ""
echo "📋 NEXT_PUBLIC environment variables:"
env | grep "^NEXT_PUBLIC_" | while read -r line; do
    var_name=$(echo "$line" | cut -d'=' -f1)
    var_value=$(echo "$line" | cut -d'=' -f2-)
    if [ -n "$var_value" ]; then
        echo "$var_name=${var_value:0:10}... (length: ${#var_value})"
    else
        echo "$var_name=(empty)"
    fi
done

# These environment variables should already be set as ENV in the Dockerfile
# No need to re-export them, they're already available

# Run the build
echo "🔨 Running pnpm build:render..."
echo "📋 NODE_OPTIONS: ${NODE_OPTIONS}"
pnpm run build:render

echo "✅ Build completed!"