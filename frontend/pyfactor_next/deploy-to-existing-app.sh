#!/bin/bash

# =============================================================================
# 🚀 DEPLOY TO EXISTING AMPLIFY APP (DottApp)
# =============================================================================
# Deploy current frontend to the existing app connected to dottapps.com
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Using your existing app
APP_ID="d1v0w1avi9aszs"  # Your existing DottApp
BRANCH_NAME="Dott_Main_Deploy"  # The branch with the working app code
AWS_REGION="us-east-1"

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

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install it first"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run: aws configure"
    exit 1
fi

print_success "AWS CLI configured"

# Check if build exists
if [ ! -d ".next" ]; then
    print_error "No .next build directory found. Please run 'pnpm run build' first"
    exit 1
fi

print_success "Build directory found"

# =============================================================================
# Update App Configuration
# =============================================================================

print_header "⚙️ UPDATING APP CONFIGURATION"

print_info "Updating build settings for production..."

# Update the app's build spec
aws amplify update-app \
    --app-id $APP_ID \
    --region $AWS_REGION \
    --environment-variables '{
        "NEXT_PUBLIC_API_URL": "https://api.dottapps.com",
        "BACKEND_API_URL": "https://api.dottapps.com",
        "USE_DATABASE": "true",
        "MOCK_DATA_DISABLED": "true",
        "PROD_MODE": "true",
        "NODE_ENV": "production"
    }' \
    --build-spec '{
        "version": 1,
        "frontend": {
            "phases": {
                "preBuild": {
                    "commands": [
                        "echo \"Installing dependencies with pnpm...\"",
                        "npm install -g pnpm@8.10.0",
                        "pnpm install --frozen-lockfile"
                    ]
                },
                "build": {
                    "commands": [
                        "echo \"Building Next.js application for production...\"",
                        "export NODE_ENV=production",
                        "export NEXT_PUBLIC_API_URL=https://api.dottapps.com", 
                        "export BACKEND_API_URL=https://api.dottapps.com",
                        "export USE_DATABASE=true",
                        "export MOCK_DATA_DISABLED=true",
                        "export PROD_MODE=true",
                        "export NODE_OPTIONS=\"--max-old-space-size=4096\"",
                        "pnpm run build"
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
                    ".next/cache/**/*",
                    ".pnpm-store/**/*"
                ]
            }
        }
    }' > /dev/null

if [ $? -eq 0 ]; then
    print_success "App configuration updated"
else
    print_error "Failed to update app configuration"
    exit 1
fi

# =============================================================================
# Start New Deployment
# =============================================================================

print_header "🚀 STARTING NEW DEPLOYMENT"

print_info "Triggering a new build on branch: $BRANCH_NAME"

# Start a webhook deployment (this will trigger a build from the connected Git repo)
DEPLOYMENT_ID=$(aws amplify start-job \
    --app-id $APP_ID \
    --branch-name "$BRANCH_NAME" \
    --job-type RELEASE \
    --region $AWS_REGION \
    --query 'jobSummary.jobId' \
    --output text)

if [ $? -eq 0 ] && [ ! -z "$DEPLOYMENT_ID" ]; then
    print_success "Deployment started with ID: $DEPLOYMENT_ID"
    
    # Wait for deployment to complete
    print_info "Waiting for deployment to complete..."
    print_warning "This may take 5-10 minutes..."
    
    while true; do
        JOB_STATUS=$(aws amplify get-job \
            --app-id $APP_ID \
            --branch-name "$BRANCH_NAME" \
            --job-id $DEPLOYMENT_ID \
            --region $AWS_REGION \
            --query 'job.summary.status' \
            --output text)
        
        case $JOB_STATUS in
            "SUCCEED")
                print_success "🎉 Deployment completed successfully!"
                break
                ;;
            "FAILED"|"CANCELLED")
                print_error "Deployment failed with status: $JOB_STATUS"
                
                # Get deployment logs for debugging
                print_info "Getting deployment logs..."
                aws amplify get-job \
                    --app-id $APP_ID \
                    --branch-name "$BRANCH_NAME" \
                    --job-id $DEPLOYMENT_ID \
                    --region $AWS_REGION \
                    --query 'job.steps[*].{stepName:stepName,status:status,logUrl:logUrl}' \
                    --output table
                exit 1
                ;;
            *)
                print_info "Deployment status: $JOB_STATUS - waiting..."
                sleep 30
                ;;
        esac
    done
else
    print_error "Failed to start deployment"
    exit 1
fi

# =============================================================================
# Verify Deployment
# =============================================================================

print_header "🧪 VERIFYING DEPLOYMENT"

# Get the app URL
APP_URL=$(aws amplify get-app --app-id $APP_ID --region $AWS_REGION --query 'app.defaultDomain' --output text)
BRANCH_URL="https://$BRANCH_NAME.$APP_URL"

print_success "✅ DEPLOYMENT SUCCESSFUL!"
print_info "Your app is now live at: https://dottapps.com"
print_info "Branch URL: $BRANCH_URL"

# =============================================================================
# Final Summary
# =============================================================================

print_header "📋 DEPLOYMENT SUMMARY"

echo -e "${GREEN}🎉 SUCCESS! Your frontend is now deployed!${NC}"
echo ""
echo "🌐 **Your app is live at:** https://dottapps.com"
echo "🔗 **Direct branch URL:** $BRANCH_URL"
echo "📱 **App ID:** $APP_ID"
echo "🌿 **Branch:** $BRANCH_NAME"
echo ""
echo "🔗 **Next Steps:**"
echo "   1. 🌐 Visit https://dottapps.com to see your app"
echo "   2. 🧪 Test all the functionality"
echo "   3. 🎯 Monitor in Amplify Console"
echo ""
echo "🎯 **Amplify Console:** https://console.aws.amazon.com/amplify/home?region=$AWS_REGION#/$APP_ID"

print_success "🎉 DEPLOYMENT COMPLETE!" 