#!/bin/bash

# Trigger Amplify Deployment for dottapps.com
echo "🚀 Triggering Amplify deployment for dottapps.com"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Step 1: Find the Amplify app
print_status "Finding Amplify app..."

# Try to find app with default domain or custom domain
APP_ID=$(aws amplify list-apps --query "apps[0].appId" --output text 2>/dev/null)

if [ "$APP_ID" == "None" ] || [ -z "$APP_ID" ]; then
    print_error "No Amplify app found. Creating one..."
    
    # Create a new Amplify app
    print_status "Creating new Amplify app for Dott..."
    APP_ID=$(aws amplify create-app \
        --name "DottApp" \
        --description "Dott Application Frontend" \
        --repository "https://github.com/your-repo/dott" \
        --platform "WEB" \
        --query "app.appId" \
        --output text 2>/dev/null)
    
    if [ -z "$APP_ID" ] || [ "$APP_ID" == "None" ]; then
        print_error "Failed to create Amplify app"
        exit 1
    fi
    
    print_success "Created new Amplify app: $APP_ID"
else
    print_success "Found existing Amplify app: $APP_ID"
fi

# Step 2: Update app settings
print_status "Updating app build settings..."

aws amplify update-app \
    --app-id "$APP_ID" \
    --name "DottApp" \
    --description "Dott Application Frontend" \
    --platform "WEB" \
    --build-spec "$(cat amplify.yml)" \
    2>/dev/null

print_success "Updated app settings"

# Step 3: Check for custom domain
print_status "Checking domain configuration..."

DOMAIN_STATUS=$(aws amplify list-domain-associations \
    --app-id "$APP_ID" \
    --query "domainAssociations[?domainName=='dottapps.com'].domainStatus" \
    --output text 2>/dev/null)

if [ -z "$DOMAIN_STATUS" ] || [ "$DOMAIN_STATUS" == "None" ]; then
    print_warning "dottapps.com not connected to this app"
    print_status "Please connect dottapps.com domain in AWS Amplify Console"
    print_status "URL: https://console.aws.amazon.com/amplify/home#/apps/$APP_ID/settings/customdomains"
else
    print_success "Domain dottapps.com status: $DOMAIN_STATUS"
fi

# Step 4: Create/update branch
print_status "Setting up main branch..."

BRANCH_NAME="main"
aws amplify create-branch \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --description "Main production branch" \
    2>/dev/null || print_warning "Branch may already exist"

# Step 5: Trigger deployment
print_status "Starting deployment..."

JOB_ID=$(aws amplify start-job \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --job-type "RELEASE" \
    --query "jobSummary.jobId" \
    --output text 2>/dev/null)

if [ -z "$JOB_ID" ] || [ "$JOB_ID" == "None" ]; then
    print_error "Failed to start deployment"
    print_status "You may need to connect a Git repository to the app"
    print_status "URL: https://console.aws.amazon.com/amplify/home#/apps/$APP_ID"
    exit 1
fi

print_success "Deployment started! Job ID: $JOB_ID"

# Step 6: Monitor deployment
print_status "Monitoring deployment progress..."

for i in {1..30}; do
    STATUS=$(aws amplify get-job \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH_NAME" \
        --job-id "$JOB_ID" \
        --query "job.summary.status" \
        --output text 2>/dev/null)
    
    case $STATUS in
        "SUCCEED")
            print_success "🎉 Deployment completed successfully!"
            print_success "Your app should now be live at: https://dottapps.com"
            exit 0
            ;;
        "FAILED")
            print_error "❌ Deployment failed"
            print_status "Check logs at: https://console.aws.amazon.com/amplify/home#/apps/$APP_ID/$BRANCH_NAME/$JOB_ID"
            exit 1
            ;;
        "RUNNING"|"PENDING")
            print_status "Deployment in progress... ($STATUS)"
            ;;
        *)
            print_warning "Unknown status: $STATUS"
            ;;
    esac
    
    sleep 10
done

print_warning "Deployment is taking longer than expected"
print_status "Check status at: https://console.aws.amazon.com/amplify/home#/apps/$APP_ID"
print_status "App ID: $APP_ID"
print_status "Job ID: $JOB_ID" 