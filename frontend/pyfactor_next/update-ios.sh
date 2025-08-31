#!/bin/bash

# Enhanced iOS Update Script - Ensures changes are ALWAYS reflected in simulator
# This script handles all the quirks and caching issues with Capacitor/Xcode

echo "🚀 iOS Update Script - Ensuring changes are reflected in simulator"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Kill any running simulators to prevent caching
echo -e "${YELLOW}Step 1: Shutting down all simulators...${NC}"
xcrun simctl shutdown all 2>/dev/null || true

# Step 2: Clear Xcode Derived Data (major cache culprit)
echo -e "${YELLOW}Step 2: Clearing Xcode Derived Data...${NC}"
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true

# Step 3: Clear simulator caches
echo -e "${YELLOW}Step 3: Clearing simulator caches...${NC}"
xcrun simctl erase all 2>/dev/null || true

# Step 4: Copy ALL mobile files from out/ to iOS public folder
echo -e "${YELLOW}Step 4: Copying all mobile files to iOS...${NC}"
SOURCE_DIR="./out"
IOS_DIR="./ios/App/App/public"

# First, copy all mobile-*.html files
for file in $SOURCE_DIR/mobile-*.html; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        cp "$file" "$IOS_DIR/$filename"
        echo -e "  ${GREEN}✓${NC} Copied $filename"
    fi
done

# Also copy other essential files
ESSENTIAL_FILES=("index.html" "invite.html" "jobs.html" "logo.png" "logomobile.png")
for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$SOURCE_DIR/$file" ]; then
        cp "$SOURCE_DIR/$file" "$IOS_DIR/$file"
        echo -e "  ${GREEN}✓${NC} Copied $file"
    fi
done

# Step 5: Run Capacitor sync with clean option
echo -e "${YELLOW}Step 5: Running Capacitor sync...${NC}"
npx cap sync ios

# Step 6: Add timestamp to capacitor.config.json to force reload
echo -e "${YELLOW}Step 6: Updating config timestamp...${NC}"
CONFIG_FILE="./ios/App/App/capacitor.config.json"
if [ -f "$CONFIG_FILE" ]; then
    # Add or update a timestamp in the config to force reload
    TIMESTAMP=$(date +%s)
    if grep -q "lastUpdate" "$CONFIG_FILE"; then
        # Update existing timestamp
        sed -i '' "s/\"lastUpdate\": \"[0-9]*\"/\"lastUpdate\": \"$TIMESTAMP\"/" "$CONFIG_FILE"
    else
        # Add timestamp before the last closing brace
        sed -i '' "s/}$/,\"lastUpdate\": \"$TIMESTAMP\"}/" "$CONFIG_FILE"
    fi
    echo -e "  ${GREEN}✓${NC} Config timestamp updated"
fi

# Step 7: Clear WebView cache by updating Info.plist
echo -e "${YELLOW}Step 7: Forcing WebView cache clear...${NC}"
INFO_PLIST="./ios/App/App/Info.plist"
if [ -f "$INFO_PLIST" ]; then
    # Update CFBundleVersion to force cache clear
    BUILD_NUMBER=$(date +%Y%m%d%H%M%S)
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$INFO_PLIST"
    echo -e "  ${GREEN}✓${NC} Build number updated to $BUILD_NUMBER"
fi

# Step 8: Clean build folder
echo -e "${YELLOW}Step 8: Cleaning build folder...${NC}"
if [ -d "./ios/App/build" ]; then
    rm -rf ./ios/App/build
    echo -e "  ${GREEN}✓${NC} Build folder cleaned"
fi

# Step 9: Run pod install to ensure dependencies are fresh
echo -e "${YELLOW}Step 9: Running pod install...${NC}"
cd ios/App
pod install --repo-update
cd ../..
echo -e "  ${GREEN}✓${NC} Pods installed"

echo ""
echo -e "${GREEN}✅ Update complete! Your changes will now be reflected.${NC}"
echo ""
echo "Next steps:"
echo "1. Run: npx cap run ios"
echo "   OR"
echo "2. Open Xcode: npx cap open ios"
echo "   - Press Cmd+Shift+K to clean build"
echo "   - Press Cmd+R to run"
echo ""
echo -e "${YELLOW}💡 TIP: For future updates, just run: ./update-ios.sh${NC}"