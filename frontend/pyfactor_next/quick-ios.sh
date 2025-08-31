#!/bin/bash

# Quick iOS Update - Fast refresh for development
# Use this for rapid iteration during development

echo "⚡ Quick iOS Update - Fast refresh mode"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Copy changed files
echo -e "${YELLOW}Copying files...${NC}"
SOURCE_DIR="./out"
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