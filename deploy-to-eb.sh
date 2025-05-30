#!/bin/bash

# Deploy to AWS Elastic Beanstalk Script
# This script deploys the Django backend to AWS Elastic Beanstalk

set -e

echo "🚀 Starting deployment to AWS Elastic Beanstalk..."
echo "=============================================="

# Configuration
APP_NAME="DottApp"
ENV_NAME="DottApp-simple"
REGION="us-east-1"
PLATFORM="Docker"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
        echo "Visit: https://aws.amazon.com/cli/"
        exit 1
    fi
}

# Function to check if EB CLI is installed
check_eb_cli() {
    if ! command -v eb &> /dev/null; then
        echo -e "${RED}❌ EB CLI is not installed. Please install it first.${NC}"
        echo "Run: pip install awsebcli"
        exit 1
    fi
}

# Check prerequisites
echo "📋 Checking prerequisites..."
check_aws_cli
check_eb_cli

# Navigate to backend directory
cd "$(dirname "$0")/backend/pyfactor"

# Check if .elasticbeanstalk directory exists
if [ ! -d ".elasticbeanstalk" ]; then
    echo -e "${YELLOW}⚠️  Initializing Elastic Beanstalk application...${NC}"
    eb init -p "$PLATFORM" "$APP_NAME" --region "$REGION"
else
    echo -e "${GREEN}✅ Elastic Beanstalk already initialized${NC}"
fi

# Create deployment package
echo -e "\n📦 Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_LABEL="deploy-$TIMESTAMP"

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "📌 Current branch: ${YELLOW}$CURRENT_BRANCH${NC}"

# Show recent commits
echo -e "\n📝 Recent commits:"
git log --oneline -5

# Deploy to Elastic Beanstalk
echo -e "\n🚀 Deploying to environment: ${YELLOW}$ENV_NAME${NC}"
echo "This may take several minutes..."

# Deploy using EB CLI
eb deploy "$ENV_NAME" --label "$DEPLOY_LABEL" --timeout 30

# Check deployment status
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Deployment successful!${NC}"
    
    # Get environment info
    echo -e "\n📊 Environment status:"
    eb status "$ENV_NAME"
    
    # Get environment URL
    ENV_URL=$(eb status "$ENV_NAME" | grep "CNAME:" | awk '{print $2}')
    if [ ! -z "$ENV_URL" ]; then
        echo -e "\n🌐 Application URL: ${GREEN}https://$ENV_URL${NC}"
        echo -e "📍 Health endpoint: ${GREEN}https://$ENV_URL/health/${NC}"
    fi
    
    # Show recent events
    echo -e "\n📅 Recent events:"
    eb events "$ENV_NAME" -n 5
    
else
    echo -e "\n${RED}❌ Deployment failed!${NC}"
    echo "Check the logs for more information:"
    echo "  eb logs $ENV_NAME"
    exit 1
fi

# Return to project root
cd ../..

echo -e "\n✨ Deployment script completed!"
echo -e "\n💡 Useful commands:"
echo "  - View logs: eb logs $ENV_NAME"
echo "  - SSH to instance: eb ssh $ENV_NAME"
echo "  - Open in browser: eb open $ENV_NAME"
echo "  - Monitor health: eb health $ENV_NAME"