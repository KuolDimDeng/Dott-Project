#!/bin/bash

# Dott iOS App Version Management Script
# This script helps manage version numbers for iOS app archives

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to iOS project directory
cd /Users/kuoldeng/projectx/frontend/pyfactor_next/ios/App

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}     Dott iOS Version Management Tool      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Check if agvtool is available
if ! command -v agvtool &> /dev/null; then
    echo -e "${RED}Error: agvtool not found. Please install Xcode Command Line Tools${NC}"
    exit 1
fi

# Get current versions
CURRENT_MARKETING=$(agvtool what-marketing-version -terse1 2>/dev/null || echo "1.0")
CURRENT_BUILD=$(agvtool what-version -terse 2>/dev/null || echo "1")

echo -e "${YELLOW}Current Version Information:${NC}"
echo -e "Marketing Version: ${GREEN}$CURRENT_MARKETING${NC}"
echo -e "Build Number: ${GREEN}$CURRENT_BUILD${NC}"
echo ""

echo -e "${YELLOW}Select an action:${NC}"
echo "1. 📦 New TestFlight Build (increment build number only)"
echo "2. 🐛 Bug Fix Release (1.0.0 → 1.0.1)"
echo "3. ✨ Feature Release (1.0.0 → 1.1.0)"
echo "4. 🚀 Major Release (1.0.0 → 2.0.0)"
echo "5. ✏️  Set Custom Version"
echo "6. 📋 View Version History"
echo "7. 🔄 Sync with Capacitor"
echo "0. ❌ Exit"
echo ""

read -p "Enter your choice (0-7): " choice

case $choice in
    1)
        echo -e "\n${YELLOW}Incrementing build number...${NC}"
        agvtool next-version -all
        NEW_BUILD=$(agvtool what-version -terse)
        echo -e "${GREEN}✓ Build number updated to: $NEW_BUILD${NC}"
        echo -e "${BLUE}Ready for TestFlight upload!${NC}"
        ;;
    
    2)
        echo -e "\n${YELLOW}Creating bug fix release...${NC}"
        IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_MARKETING"
        MAJOR="${VERSION_PARTS[0]:-1}"
        MINOR="${VERSION_PARTS[1]:-0}"
        PATCH="${VERSION_PARTS[2]:-0}"
        NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
        
        agvtool new-marketing-version $NEW_VERSION
        agvtool new-version -all 1
        echo -e "${GREEN}✓ Version updated to: $NEW_VERSION (Build 1)${NC}"
        
        # Create git tag
        read -p "Create git tag for this release? (y/n): " create_tag
        if [[ $create_tag == "y" ]]; then
            read -p "Enter release notes: " release_notes
            git tag -a "v$NEW_VERSION" -m "$release_notes"
            echo -e "${GREEN}✓ Git tag v$NEW_VERSION created${NC}"
        fi
        ;;
    
    3)
        echo -e "\n${YELLOW}Creating feature release...${NC}"
        IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_MARKETING"
        MAJOR="${VERSION_PARTS[0]:-1}"
        MINOR="${VERSION_PARTS[1]:-0}"
        NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
        
        agvtool new-marketing-version $NEW_VERSION
        agvtool new-version -all 1
        echo -e "${GREEN}✓ Version updated to: $NEW_VERSION (Build 1)${NC}"
        
        # Create git tag
        read -p "Create git tag for this release? (y/n): " create_tag
        if [[ $create_tag == "y" ]]; then
            read -p "Enter release notes: " release_notes
            git tag -a "v$NEW_VERSION" -m "$release_notes"
            echo -e "${GREEN}✓ Git tag v$NEW_VERSION created${NC}"
        fi
        ;;
    
    4)
        echo -e "\n${YELLOW}Creating major release...${NC}"
        IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_MARKETING"
        MAJOR="${VERSION_PARTS[0]:-1}"
        NEW_VERSION="$((MAJOR + 1)).0.0"
        
        agvtool new-marketing-version $NEW_VERSION
        agvtool new-version -all 1
        echo -e "${GREEN}✓ Version updated to: $NEW_VERSION (Build 1)${NC}"
        
        # Create git tag
        read -p "Create git tag for this release? (y/n): " create_tag
        if [[ $create_tag == "y" ]]; then
            read -p "Enter release notes: " release_notes
            git tag -a "v$NEW_VERSION" -m "$release_notes"
            echo -e "${GREEN}✓ Git tag v$NEW_VERSION created${NC}"
        fi
        ;;
    
    5)
        echo -e "\n${YELLOW}Set custom version:${NC}"
        read -p "Enter marketing version (e.g., 1.2.3): " custom_marketing
        read -p "Enter build number: " custom_build
        
        if [[ -n "$custom_marketing" && -n "$custom_build" ]]; then
            agvtool new-marketing-version $custom_marketing
            agvtool new-version -all $custom_build
            echo -e "${GREEN}✓ Version updated to: $custom_marketing (Build $custom_build)${NC}"
        else
            echo -e "${RED}Invalid input. Version not changed.${NC}"
        fi
        ;;
    
    6)
        echo -e "\n${YELLOW}Version History:${NC}"
        echo "Recent git tags:"
        git tag -l "v*" --sort=-version:refname | head -10
        echo ""
        echo "For detailed history, check VERSIONS.md"
        ;;
    
    7)
        echo -e "\n${YELLOW}Syncing with Capacitor...${NC}"
        cd ../..
        echo "Building web app..."
        pnpm run build
        echo "Syncing iOS..."
        npx cap sync ios
        echo -e "${GREEN}✓ Capacitor sync complete${NC}"
        echo -e "${BLUE}Remember to open Xcode and create archive${NC}"
        ;;
    
    0)
        echo -e "${YELLOW}Exiting...${NC}"
        exit 0
        ;;
    
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}Final Version Information:${NC}"
echo -e "Marketing Version: ${GREEN}$(agvtool what-marketing-version -terse1)${NC}"
echo -e "Build Number: ${GREEN}$(agvtool what-version -terse)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Open Xcode: ${BLUE}open App.xcworkspace${NC}"
echo "2. Select 'Any iOS Device' as destination"
echo "3. Menu: Product → Archive"
echo "4. Upload to App Store Connect"