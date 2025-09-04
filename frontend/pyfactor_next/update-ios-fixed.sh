#!/bin/bash

# iOS Update Script - Fixed Version
# This script properly updates iOS without overwriting important changes

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 iOS Update Script (Fixed) - Ensuring changes are reflected correctly"
echo "========================================================================"

# Step 1: Ensure /out files are correct FIRST
echo -e "${YELLOW}Step 1: Fixing source files in /out directory...${NC}"

# Fix mobile-auth.html to use direct backend API
if [ -f "./out/mobile-auth.html" ]; then
    # Use sed to replace staging.dottapps.com with dott-api-staging.onrender.com for API calls
    sed -i.bak 's|https://staging.dottapps.com/api/|https://dott-api-staging.onrender.com/api/|g' ./out/mobile-auth.html
    echo -e "  ${GREEN}✓${NC} Fixed API URLs in mobile-auth.html"
fi

# Step 2: Clear caches
echo -e "${YELLOW}Step 2: Clearing caches...${NC}"
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} Cleared Xcode DerivedData"

# Step 3: Copy files from /out to iOS
echo -e "${YELLOW}Step 3: Copying files from /out to iOS...${NC}"
SOURCE_DIR="./out"
IOS_DIR="./ios/App/App/public"

# Copy all mobile files
for file in $SOURCE_DIR/mobile-*.html $SOURCE_DIR/*.html $SOURCE_DIR/*.png; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        cp "$file" "$IOS_DIR/$filename"
        echo -e "  ${GREEN}✓${NC} Copied $filename"
    fi
done

# Step 4: Run Capacitor copy (NOT sync, to avoid overwriting)
echo -e "${YELLOW}Step 4: Running Capacitor copy (not sync)...${NC}"
npx cap copy ios

# Step 5: Update build number to force cache clear
echo -e "${YELLOW}Step 5: Forcing cache clear...${NC}"
BUILD_NUMBER=$(date +%Y%m%d%H%M%S)
PLIST_FILE="./ios/App/App/Info.plist"
if [ -f "$PLIST_FILE" ]; then
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$PLIST_FILE" 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Build number updated to $BUILD_NUMBER"
fi

# Step 6: Pod install (if needed)
echo -e "${YELLOW}Step 6: Installing pods...${NC}"
cd ios/App
pod install --repo-update
cd ../..
echo -e "  ${GREEN}✓${NC} Pods installed"

echo ""
echo -e "${GREEN}✅ Update complete! Your changes are preserved.${NC}"
echo ""
echo "Next steps:"
echo "1. Run: npx cap open ios"
echo "2. In Xcode: Clean Build Folder (Cmd+Shift+K)"
echo "3. Run the app (Cmd+R)"
echo ""
echo -e "${YELLOW}Important: This script preserves your direct backend API URLs${NC}"