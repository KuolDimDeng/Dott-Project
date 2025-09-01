#!/bin/bash

# Quick iOS Update - Fast refresh for development
# Use this for rapid iteration during development

echo "⚡ Quick iOS Update - Fast refresh mode"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 0: Copy to main /out/ directory first (if files exist in current out/)
echo -e "${BLUE}Syncing to main /out/ directory...${NC}"
MAIN_OUT_DIR="/Users/kuoldeng/projectx/out"
SOURCE_DIR="./out"

# Copy all mobile files to main /out/ if they exist in current out/
if ls $SOURCE_DIR/mobile-*.html 1> /dev/null 2>&1; then
    cp -r $SOURCE_DIR/mobile-*.html $MAIN_OUT_DIR/ 2>/dev/null
    echo -e "${GREEN}✓ Mobile files synced to main /out/${NC}"
fi

# Step 1: Copy changed files to iOS
echo -e "${YELLOW}Copying files to iOS...${NC}"
IOS_DIR="./ios/App/App/public"

# Copy all mobile files
cp -r $SOURCE_DIR/mobile-*.html $IOS_DIR/ 2>/dev/null
cp $SOURCE_DIR/index.html $IOS_DIR/ 2>/dev/null
cp $SOURCE_DIR/invite.html $IOS_DIR/ 2>/dev/null
cp $SOURCE_DIR/jobs.html $IOS_DIR/ 2>/dev/null

# Step 2: Quick sync (no pod install)
echo -e "${YELLOW}Syncing...${NC}"
npx cap copy ios

# Step 3: Force reload by updating build number
BUILD_NUMBER=$(date +%s)
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "./ios/App/App/Info.plist" 2>/dev/null

echo -e "${GREEN}✅ Quick update complete!${NC}"
echo "Run: npx cap run ios"