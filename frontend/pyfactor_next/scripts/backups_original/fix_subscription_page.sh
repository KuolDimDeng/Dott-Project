#!/bin/bash

# fix_subscription_page.sh
# This script applies the emergency fix for the subscription page rendering issues

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print banner
echo -e "${YELLOW}=====================================${NC}"
echo -e "${YELLOW}   Subscription Page Emergency Fix   ${NC}"
echo -e "${YELLOW}=====================================${NC}"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed or not in PATH${NC}"
    echo "Please install Node.js before running this script"
    exit 1
fi

# Navigate to script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "\n${YELLOW}Applying emergency fix for subscription page...${NC}"

# Execute the fix script
if node Version0004_emergency_subscription_fix.js; then
    echo -e "${GREEN}Emergency fix applied successfully!${NC}"
    
    # Check if we need to restart Next.js server
    if pgrep -f "next dev" > /dev/null; then
        echo -e "\n${YELLOW}Next.js development server is running.${NC}"
        echo -e "To see changes, you should restart the Next.js server."
        
        read -p "Would you like to restart the Next.js server now? (y/n): " restart_server
        if [[ $restart_server == "y" || $restart_server == "Y" ]]; then
            echo -e "\n${YELLOW}Restarting Next.js server...${NC}"
            cd ../
            pkill -f "next dev"
            npm run dev &
            echo -e "${GREEN}Next.js server restarted successfully!${NC}"
        else
            echo -e "\n${YELLOW}Please restart the Next.js server manually when ready.${NC}"
        fi
    fi
    
    echo -e "\n${GREEN}The subscription page has been fixed.${NC}"
    echo -e "Please test by visiting the onboarding flow."
    echo -e "A backup of the original file has been created in case you need to revert."
else
    echo -e "${RED}Error: Failed to apply emergency fix.${NC}"
    echo "Please check the logs above for details."
    exit 1
fi

exit 0 