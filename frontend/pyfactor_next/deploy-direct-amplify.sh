#!/bin/bash

# =============================================================================
# 🚀 AWS AMPLIFY DIRECT DEPLOYMENT SCRIPT 
# =============================================================================
# Deploy Next.js app directly to AWS Amplify using AWS CLI
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="dottapps-frontend"
AWS_REGION="us-east-1"
REPOSITORY_URL="https://github.com/kuoldeng/projectx"  # Replace with your actual repo

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
# Create Amplify App
# =============================================================================

print_header "🚀 CREATING AMPLIFY APP"

# Check if app already exists
APP_EXISTS=$(aws amplify list-apps --region $AWS_REGION --query "apps[?name=='$APP_NAME'].appId" --output text)

if [ -z "$APP_EXISTS" ]; then
    print_info "Creating new Amplify app: $APP_NAME"
    
    # Create the app
    APP_ID=$(aws amplify create-app \
        --name "$APP_NAME" \
        --description "DottApps Frontend - Next.js Application" \
        --platform "WEB" \
        --region $AWS_REGION \
        --custom-rules '[
            {
                "source": "/<*>",
                "target": "/index.html",
                "status": "404-200"
            }
        ]' \
        --environment-variables '{
            "NEXT_PUBLIC_API_URL": "https://api.dottapps.com",
            "BACKEND_API_URL": "https://api.dottapps.com",
            "USE_DATABASE": "true",
            "MOCK_DATA_DISABLED": "true",
            "PROD_MODE": "true",
            "_LIVE_UPDATES": "[{\"name\":\"Amplify CLI\",\"version\":\"12.12.6\",\"lastPushTimeStamp\":\"2024-05-22T01:00:00.000Z\"}]"
        }' \
        --build-spec '{
            "version": 1,
            "frontend": {
                "phases": {
                    "preBuild": {
                        "commands": [
                            "echo \"Installing dependencies with pnpm...\"",
                            "npm install -g pnpm@8.10.0",
                            "pnpm install"
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
        }' \
        --query 'app.appId' \
        --output text)
    
    if [ $? -eq 0 ] && [ ! -z "$APP_ID" ]; then
        print_success "Amplify app created with ID: $APP_ID"
    else
        print_error "Failed to create Amplify app"
        exit 1
    fi
else
    APP_ID="$APP_EXISTS"
    print_success "Using existing Amplify app: $APP_ID"
fi

# =============================================================================
# Create Branch
# =============================================================================

print_header "🌿 SETTING UP BRANCH"

BRANCH_NAME="main"

# Check if branch exists
BRANCH_EXISTS=$(aws amplify list-branches --app-id $APP_ID --region $AWS_REGION --query "branches[?branchName=='$BRANCH_NAME'].branchName" --output text)

if [ -z "$BRANCH_EXISTS" ]; then
    print_info "Creating branch: $BRANCH_NAME"
    
    aws amplify create-branch \
        --app-id $APP_ID \
        --branch-name $BRANCH_NAME \
        --description "Main production branch" \
        --enable-auto-build \
        --region $AWS_REGION \
        --stage "PRODUCTION" > /dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Branch '$BRANCH_NAME' created successfully"
    else
        print_error "Failed to create branch"
        exit 1
    fi
else
    print_success "Branch '$BRANCH_NAME' already exists"
fi

# =============================================================================
# Create Zip Archive for Deployment
# =============================================================================

print_header "📦 PREPARING DEPLOYMENT PACKAGE"

# Create a deployment directory
mkdir -p deployment-temp

# Copy all necessary files for deployment
cp -r .next deployment-temp/
cp -r public deployment-temp/ 2>/dev/null || true
cp package.json deployment-temp/
cp next.config.js deployment-temp/ 2>/dev/null || true
cp amplify.yml deployment-temp/ 2>/dev/null || true

# Create zip file
cd deployment-temp
zip -r ../deployment.zip . > /dev/null
cd ..

# Clean up temp directory
rm -rf deployment-temp

print_success "Deployment package created: deployment.zip"

# =============================================================================
# Upload to S3
# =============================================================================

print_header "☁️ UPLOADING TO S3"

# Create a unique S3 bucket name for deployment
S3_BUCKET="amplify-deploy-$(date +%s)-$(whoami)"
S3_KEY="deployment-$(date +%s).zip"

# Create S3 bucket
print_info "Creating S3 bucket: $S3_BUCKET"
aws s3 mb s3://$S3_BUCKET --region $AWS_REGION

if [ $? -eq 0 ]; then
    print_success "S3 bucket created"
else
    print_error "Failed to create S3 bucket"
    exit 1
fi

# Upload deployment package
print_info "Uploading deployment package to S3..."
aws s3 cp deployment.zip s3://$S3_BUCKET/$S3_KEY

if [ $? -eq 0 ]; then
    print_success "Deployment package uploaded to S3"
    S3_URL="s3://$S3_BUCKET/$S3_KEY"
else
    print_error "Failed to upload to S3"
    exit 1
fi

# =============================================================================
# Deploy to Amplify
# =============================================================================

print_header "🚀 DEPLOYING TO AMPLIFY"

print_info "Starting deployment from S3..."

# Start deployment
DEPLOYMENT_ID=$(aws amplify start-deployment \
    --app-id $APP_ID \
    --branch-name $BRANCH_NAME \
    --source-url "$S3_URL" \
    --region $AWS_REGION \
    --query 'jobSummary.jobId' \
    --output text)

if [ $? -eq 0 ] && [ ! -z "$DEPLOYMENT_ID" ]; then
    print_success "Deployment started with ID: $DEPLOYMENT_ID"
    
    # Wait for deployment to complete
    print_info "Waiting for deployment to complete..."
    
    while true; do
        JOB_STATUS=$(aws amplify get-job \
            --app-id $APP_ID \
            --branch-name $BRANCH_NAME \
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
                    --branch-name $BRANCH_NAME \
                    --job-id $DEPLOYMENT_ID \
                    --region $AWS_REGION \
                    --query 'job.steps[].logUrl' \
                    --output text
                exit 1
                ;;
            *)
                print_info "Deployment status: $JOB_STATUS - waiting..."
                sleep 10
                ;;
        esac
    done
else
    print_error "Failed to start deployment"
    exit 1
fi

# =============================================================================
# Get App URL and Configure Custom Domain
# =============================================================================

print_header "🌐 GETTING APP INFORMATION"

# Get the default domain
APP_URL=$(aws amplify get-app --app-id $APP_ID --region $AWS_REGION --query 'app.defaultDomain' --output text)
DEFAULT_URL="https://$BRANCH_NAME.$APP_URL"

print_success "App deployed successfully!"
print_info "Default URL: $DEFAULT_URL"

# =============================================================================
# Configure Custom Domain
# =============================================================================

print_header "🔗 CONFIGURING CUSTOM DOMAIN"

CUSTOM_DOMAIN="dottapps.com"

# Check if domain is already associated
DOMAIN_EXISTS=$(aws amplify list-domain-associations --app-id $APP_ID --region $AWS_REGION --query "domainAssociations[?domainName=='$CUSTOM_DOMAIN'].domainName" --output text)

if [ -z "$DOMAIN_EXISTS" ]; then
    print_info "Adding custom domain: $CUSTOM_DOMAIN"
    
    aws amplify create-domain-association \
        --app-id $APP_ID \
        --domain-name $CUSTOM_DOMAIN \
        --sub-domain-settings '[
            {
                "prefix": "",
                "branchName": "main"
            },
            {
                "prefix": "www",
                "branchName": "main"
            }
        ]' \
        --region $AWS_REGION > /dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Custom domain association created"
        print_warning "Domain verification may take a few minutes"
        print_info "You may need to update your DNS records in Route 53"
    else
        print_warning "Failed to create domain association (may already exist)"
    fi
else
    print_success "Custom domain already configured"
fi

# =============================================================================
# Final Information
# =============================================================================

print_header "📋 DEPLOYMENT SUMMARY"

echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo ""
echo "📱 App Information:"
echo "   • App ID: $APP_ID"
echo "   • Branch: $BRANCH_NAME"
echo "   • Default URL: $DEFAULT_URL"
echo "   • Custom Domain: https://$CUSTOM_DOMAIN"
echo ""
echo "🔗 Next Steps:"
echo "   1. Visit your app: $DEFAULT_URL"
echo "   2. Verify custom domain setup in Amplify Console"
echo "   3. Update Route 53 records if needed"
echo ""
echo "🎯 Amplify Console: https://console.aws.amazon.com/amplify/home?region=$AWS_REGION#/$APP_ID"

# Clean up
rm -f deployment.zip

print_success "🎉 DEPLOYMENT COMPLETE!"

# =============================================================================
# Cleanup
# =============================================================================

print_header "🧹 CLEANUP"

# Remove deployment files from S3
print_info "Cleaning up S3 deployment files..."
aws s3 rm s3://$S3_BUCKET/$S3_KEY
aws s3 rb s3://$S3_BUCKET --force

# Remove local deployment file
rm -f deployment.zip

print_success "Cleanup completed" 