#!/bin/bash

echo "🏗️ RENDER BUILD CACHE CLEAR INSTRUCTIONS"
echo "========================================"
echo ""
echo "Option 1: Force Clean Build (Recommended)"
echo "-----------------------------------------"
echo "1. Go to https://dashboard.render.com"
echo "2. Select service: dott-front"
echo "3. Go to 'Environment' tab"
echo "4. Add or update this variable:"
echo "   Name: BUILD_CACHE_BUSTER"
echo "   Value: $(date +%s)"
echo "5. Click 'Save Changes'"
echo "   This triggers a fresh build without cache"
echo ""
echo "Option 2: Manual Cache Clear"
echo "----------------------------"
echo "1. In Render dashboard, go to dott-front service"
echo "2. Click 'Manual Deploy' dropdown"
echo "3. Select 'Clear build cache and redeploy'"
echo ""
echo "Option 3: Quick Version Bump"
echo "----------------------------"
echo "Run this command to bump version and trigger rebuild:"
echo "./scripts/bump-version-for-cache.sh"
echo ""

# Create the version bump helper
cat > /Users/kuoldeng/projectx/scripts/bump-version-for-cache.sh << 'EOF'
#!/bin/bash
cd /Users/kuoldeng/projectx/frontend/pyfactor_next

# Get current version
current_version=$(grep '"version"' package.json | cut -d'"' -f4)
echo "Current version: $current_version"

# Bump patch version
IFS='.' read -ra VERSION_PARTS <<< "$current_version"
major="${VERSION_PARTS[0]}"
minor="${VERSION_PARTS[1]}"
patch="${VERSION_PARTS[2]}"
new_patch=$((patch + 1))
new_version="$major.$minor.$new_patch"

# Update package.json
sed -i '' "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" package.json

echo "New version: $new_version"
echo "Committing and pushing..."

cd /Users/kuoldeng/projectx
git add frontend/pyfactor_next/package.json
git commit -m "chore: bump version to $new_version to clear build cache"
git push origin main

echo "✅ Version bumped! Render will rebuild with fresh cache."
echo "Monitor at: https://dashboard.render.com/web/srv-crpgfj68ii6s739n5jdg/deploys"
EOF

chmod +x /Users/kuoldeng/projectx/scripts/bump-version-for-cache.sh

echo "Press Enter when you've cleared the Render build cache..."
read -r