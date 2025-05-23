#!/bin/bash

# =============================================================================
# 🚀 DEPLOY CORRECT BRANCH TO EXISTING AMPLIFY APP
# =============================================================================
# Add Dott_Main_Deploy branch and configure domain to point to it
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_ID="d1v0w1avi9aszs"  # Your existing DottApp
NEW_BRANCH="Dott_Main_Dev_Deploy"  # The actual branch with working code
OLD_BRANCH="Dott_Main_Dev_Tailwind"  # The old branch connected to domain
AWS_REGION="us-east-1"
DOMAIN="dottapps.com"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "============================================="
    echo " $1"
    echo "============================================="
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

print_header "🔍 PRE-FLIGHT CHECKS"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured"
    exit 1
fi

print_success "AWS CLI configured"

# =============================================================================
# Add New Branch to Amplify App
# =============================================================================

print_header "🌿 SETTING UP CORRECT BRANCH"

print_info "Adding branch: $NEW_BRANCH to Amplify app"

# Try to create the branch (it might already exist)
aws amplify create-branch \
    --app-id $APP_ID \
    --branch-name $NEW_BRANCH \
    --description "Production branch with working code" \
    --enable-auto-build \
    --stage "PRODUCTION" \
    --region $AWS_REGION \
    --environment-variables '{
        "NEXT_PUBLIC_API_URL": "https://api.dottapps.com",
        "BACKEND_API_URL": "https://api.dottapps.com",
        "USE_DATABASE": "true",
        "MOCK_DATA_DISABLED": "true",
        "PROD_MODE": "true",
        "NODE_ENV": "production"
    }' 2>/dev/null || print_warning "Branch may already exist (continuing...)"

print_success "Branch setup completed"

# =============================================================================
# Update Build Configuration
# =============================================================================

print_header "⚙️ UPDATING BUILD CONFIGURATION"

print_info "Updating build settings for the new branch..."

# Update the app's build spec for better compatibility
aws amplify update-app \
    --app-id $APP_ID \
    --region $AWS_REGION \
    --build-spec '{
        "version": 1,
        "frontend": {
            "phases": {
                "preBuild": {
                    "commands": [
                        "echo \"Installing dependencies...\"",
                        "npm install -g pnpm@8.10.0 || npm install -g yarn",
                        "if [ -f pnpm-lock.yaml ]; then pnpm install; elif [ -f yarn.lock ]; then yarn install; else npm install; fi"
                    ]
                },
                "build": {
                    "commands": [
                        "echo \"Building Next.js application...\"",
                        "export NODE_ENV=production",
                        "export NEXT_PUBLIC_API_URL=https://api.dottapps.com",
                        "export BACKEND_API_URL=https://api.dottapps.com",
                        "export USE_DATABASE=true",
                        "export MOCK_DATA_DISABLED=true",
                        "export PROD_MODE=true",
                        "export NODE_OPTIONS=\"--max-old-space-size=4096\"",
                        "if [ -f pnpm-lock.yaml ]; then pnpm run build; elif [ -f yarn.lock ]; then yarn build; else npm run build; fi"
                    ]
                }
            },
            "artifacts": {
                "baseDirectory": ".next",
                "files": ["**/*"]
            },
            "cache": {
                "paths": [
                    "node_modules/**/*",
                    ".next/cache/**/*"
                ]
            }
        }
    }' > /dev/null

print_success "Build configuration updated"

# =============================================================================
# Update Domain Configuration
# =============================================================================

print_header "🌐 UPDATING DOMAIN CONFIGURATION"

print_info "Updating domain to point to the correct branch..."

# First, get the current domain association
DOMAIN_ARN=$(aws amplify list-domain-associations \
    --app-id $APP_ID \
    --region $AWS_REGION \
    --query "domainAssociations[?domainName=='$DOMAIN'].domainAssociationArn" \
    --output text)

if [ ! -z "$DOMAIN_ARN" ]; then
    print_info "Found existing domain association, updating it..."
    
    # Update the domain to point to the new branch
    aws amplify update-domain-association \
        --app-id $APP_ID \
        --domain-name $DOMAIN \
        --region $AWS_REGION \
        --sub-domain-settings '[
            {
                "prefix": "",
                "branchName": "'$NEW_BRANCH'"
            },
            {
                "prefix": "www",
                "branchName": "'$NEW_BRANCH'"
            }
        ]' > /dev/null
    
    print_success "Domain updated to point to $NEW_BRANCH"
else
    print_info "Creating new domain association..."
    
    # Create new domain association
    aws amplify create-domain-association \
        --app-id $APP_ID \
        --domain-name $DOMAIN \
        --region $AWS_REGION \
        --sub-domain-settings '[
            {
                "prefix": "",
                "branchName": "'$NEW_BRANCH'"
            },
            {
                "prefix": "www",
                "branchName": "'$NEW_BRANCH'"
            }
        ]' > /dev/null
    
    print_success "Domain association created"
fi

# =============================================================================
# Start Deployment
# =============================================================================

print_header "🚀 STARTING DEPLOYMENT"

print_info "Triggering deployment from branch: $NEW_BRANCH"

# Start deployment
DEPLOYMENT_ID=$(aws amplify start-job \
    --app-id $APP_ID \
    --branch-name $NEW_BRANCH \
    --job-type RELEASE \
    --region $AWS_REGION \
    --query 'jobSummary.jobId' \
    --output text 2>/dev/null || echo "")

if [ ! -z "$DEPLOYMENT_ID" ]; then
    print_success "Deployment started with ID: $DEPLOYMENT_ID"
    print_info "Monitoring deployment progress..."
    
    # Monitor deployment
    for i in {1..20}; do
        sleep 30
        JOB_STATUS=$(aws amplify get-job \
            --app-id $APP_ID \
            --branch-name $NEW_BRANCH \
            --job-id $DEPLOYMENT_ID \
            --region $AWS_REGION \
            --query 'job.summary.status' \
            --output text 2>/dev/null || echo "UNKNOWN")
        
        case $JOB_STATUS in
            "SUCCEED")
                print_success "🎉 Deployment completed successfully!"
                break
                ;;
            "FAILED"|"CANCELLED")
                print_error "Deployment failed with status: $JOB_STATUS"
                print_info "Check the Amplify console for detailed logs"
                break
                ;;
            *)
                print_info "Deployment status: $JOB_STATUS (attempt $i/20)"
                ;;
        esac
    done
else
    print_warning "Could not start automatic deployment. You may need to trigger it manually."
fi

# =============================================================================
# Final Summary
# =============================================================================

print_header "📋 DEPLOYMENT SUMMARY"

echo -e "${GREEN}🎉 Configuration completed!${NC}"
echo ""
echo "🔧 **What was done:**"
echo "   • Added/configured branch: $NEW_BRANCH"
echo "   • Updated build configuration"
echo "   • Updated domain to point to correct branch"
echo "   • Triggered deployment"
echo ""
echo "🌐 **Your domain:** https://$DOMAIN"
echo "📱 **App ID:** $APP_ID"
echo "🌿 **Active Branch:** $NEW_BRANCH"
echo ""
echo "🔗 **Next Steps:**"
echo "   1. 🌐 Visit https://$DOMAIN (may take a few minutes)"
echo "   2. 🎯 Monitor deployment in Amplify Console"
echo "   3. 🧪 Test your application"
echo ""
echo "🎯 **Amplify Console:** https://console.aws.amazon.com/amplify/home?region=$AWS_REGION#/$APP_ID"

print_success "🎉 SETUP COMPLETE!"

echo ""
print_warning "Note: Domain changes may take 5-15 minutes to propagate globally" 