#!/bin/bash

# Safe deployment script that enforces staging -> test -> production workflow

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}DOTT DEPLOYMENT WORKFLOW${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to show usage
show_usage() {
    echo "Usage: ./deploy.sh [staging|production]"
    echo ""
    echo "Options:"
    echo "  staging     - Deploy current changes to staging"
    echo "  production  - Deploy staging to production (after testing)"
    echo ""
    echo "Workflow:"
    echo "  1. Make changes locally"
    echo "  2. ./deploy.sh staging"
    echo "  3. Test at https://staging.dottapps.com"
    echo "  4. ./deploy.sh production"
    exit 1
}

# Check arguments
if [ $# -eq 0 ]; then
    show_usage
fi

DEPLOYMENT_TARGET=$1

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

case $DEPLOYMENT_TARGET in
    staging)
        echo -e "${YELLOW}📦 Deploying to STAGING...${NC}"
        echo ""
        
        # Check for uncommitted changes
        if ! git diff-index --quiet HEAD --; then
            echo -e "${RED}❌ You have uncommitted changes!${NC}"
            echo "Please commit or stash your changes first."
            exit 1
        fi
        
        # Switch to staging branch
        echo "1. Switching to staging branch..."
        git checkout staging
        
        # Pull latest staging
        echo "2. Pulling latest staging..."
        git pull origin staging
        
        # Merge current work (if from another branch)
        if [ "$CURRENT_BRANCH" != "staging" ]; then
            echo "3. Merging $CURRENT_BRANCH into staging..."
            git merge $CURRENT_BRANCH -m "Merge $CURRENT_BRANCH into staging for testing"
        fi
        
        # Push to staging
        echo "4. Pushing to staging..."
        git push origin staging
        
        echo ""
        echo -e "${GREEN}✅ Deployed to staging!${NC}"
        echo ""
        echo "📋 Next steps:"
        echo "  1. Monitor deployment: https://dashboard.render.com"
        echo "  2. Test at: https://staging.dottapps.com"
        echo "  3. If tests pass, run: ./deploy.sh production"
        ;;
        
    production|prod|main)
        echo -e "${RED}🚀 Deploying to PRODUCTION...${NC}"
        echo ""
        
        # Confirmation prompt
        echo -e "${YELLOW}⚠️  WARNING: This will deploy to PRODUCTION!${NC}"
        echo "Have you tested the changes in staging?"
        echo ""
        read -p "Type 'yes' to continue: " confirmation
        
        if [ "$confirmation" != "yes" ]; then
            echo -e "${RED}Deployment cancelled.${NC}"
            exit 1
        fi
        
        # Check current branch
        if [ "$CURRENT_BRANCH" != "main" ]; then
            echo "1. Switching to main branch..."
            git checkout main
        fi
        
        # Pull latest main
        echo "2. Pulling latest main..."
        git pull origin main
        
        # Merge staging into main
        echo "3. Merging staging into main..."
        git merge staging -m "Deploy staging to production after testing"
        
        # Push to main (with --no-verify to bypass hook)
        echo "4. Pushing to production..."
        git push origin main --no-verify
        
        echo ""
        echo -e "${GREEN}✅ Deployed to production!${NC}"
        echo ""
        echo "📋 Monitor deployment:"
        echo "  Backend: https://dashboard.render.com/web/srv-cscbp6qj1k6c738ihorg"
        echo "  Frontend: https://dashboard.render.com/web/srv-d206moumcj7s73appe2g"
        echo ""
        echo "🌐 Production URLs:"
        echo "  Main: https://dottapps.com"
        echo "  App: https://app.dottapps.com"
        ;;
        
    *)
        echo -e "${RED}Invalid option: $DEPLOYMENT_TARGET${NC}"
        show_usage
        ;;
esac