#!/bin/bash

# Deploy Optimized Beanstalk Configuration
# This deploys the $40/month optimized setup

set -e

echo "🚀 Deploying Optimized Beanstalk Configuration..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Pre-deployment checks...${NC}"

# Check if we're in the right directory
if [ ! -f ".ebextensions/02_optimize_single_instance.config" ]; then
    echo -e "${RED}Error: Optimization files not found. Run ./optimize_beanstalk.sh first${NC}"
    exit 1
fi

# Check if eb CLI is available
if ! command -v eb &> /dev/null; then
    echo -e "${RED}Error: EB CLI not found. Install with: pip install awsebcli${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

echo -e "${YELLOW}Step 2: Checking current EB status...${NC}"
eb status || echo "No current environment detected"

echo -e "${YELLOW}Step 3: Preparing for deployment...${NC}"
# Change to backend directory for deployment
cd backend/pyfactor

echo -e "${YELLOW}Step 4: Installing optimized requirements...${NC}"
# Make sure we have the right dependencies for database-based Celery
if ! grep -q "kombu\[sqlalchemy\]" requirements.txt; then
    echo "Adding kombu[sqlalchemy] for database broker..."
    echo "kombu[sqlalchemy]>=5.0.0" >> requirements.txt
fi

if ! grep -q "django-celery-results" requirements.txt; then
    echo "Adding django-celery-results..."
    echo "django-celery-results>=2.5.0" >> requirements.txt
fi

echo -e "${GREEN}✅ Requirements updated${NC}"

echo -e "${YELLOW}Step 5: Deploying to Elastic Beanstalk...${NC}"
echo "This will:"
echo "• Switch to single instance (removes load balancer)"
echo "• Use optimized Django settings"
echo "• Add swap memory for stability"
echo "• Optimize Nginx configuration"
echo "• Set up database-based Celery"
echo ""

read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

# Deploy with the optimized configuration
eb deploy

echo -e "${GREEN}✅ Deployment complete!${NC}"

echo -e "${YELLOW}Step 6: Running post-deployment verification...${NC}"
cd ../../
./verify_optimization.sh

echo ""
echo -e "${GREEN}🎉 OPTIMIZATION DEPLOYMENT COMPLETE!${NC}"
echo ""
echo "💰 Expected monthly savings: $204"
echo "📊 New monthly cost: ~$40"
echo ""
echo "Monitor your costs in AWS Billing Dashboard"
echo "Use ./check_costs.sh for cost breakdown"
echo ""
echo "Need to scale for traffic?"
echo "• Scale up: ./scale_up_emergency.sh"
echo "• Scale down: ./scale_down.sh" 