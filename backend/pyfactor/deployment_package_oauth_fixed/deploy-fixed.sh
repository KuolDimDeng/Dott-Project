#!/bin/bash

# Deploy Fixed Dott Backend to Elastic Beanstalk
# This script fixes the WSGIPath and ProxyServer issues

echo "🚀 Deploying Fixed Dott Backend to Elastic Beanstalk"
echo "=================================================="

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

# Check if we're in the right directory
if [ ! -f "Dockerfile" ] || [ ! -d ".ebextensions" ]; then
    print_error "This script must be run from the backend/pyfactor directory"
    exit 1
fi

print_status "Starting deployment of fixed configuration..."

# Step 1: Verify configuration fixes
print_status "Verifying configuration fixes..."

# Check if ProxyServer is set to nginx
if grep -q "ProxyServer: nginx" .ebextensions/99_custom_env.config; then
    print_success "✓ ProxyServer correctly set to nginx"
else
    print_error "✗ ProxyServer not set to nginx in 99_custom_env.config"
    exit 1
fi

# Check if WSGIPath is removed from config files
if grep -q "WSGIPath" .ebextensions/*.config 2>/dev/null; then
    print_warning "⚠ WSGIPath still found in config files - this may cause issues"
    grep -n "WSGIPath" .ebextensions/*.config
else
    print_success "✓ WSGIPath removed from all config files"
fi

# Step 2: Create deployment package
print_status "Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_ZIP="dott-backend-fixed-${TIMESTAMP}.zip"

# Create zip file excluding unnecessary files
zip -r "$DEPLOY_ZIP" . \
    -x "*.pyc" \
    -x "__pycache__/*" \
    -x "*.log" \
    -x "logs/*" \
    -x "*.zip" \
    -x ".git/*" \
    -x "venv/*" \
    -x ".venv/*" \
    -x "backups/*" \
    -x "temp_*/*" \
    -x "scripts/*" \
    -x "*.backup*" \
    -x "*.md" \
    > /dev/null 2>&1

if [ -f "$DEPLOY_ZIP" ]; then
    print_success "✓ Created deployment package: $DEPLOY_ZIP"
else
    print_error "✗ Failed to create deployment package"
    exit 1
fi

# Step 3: Deploy to Elastic Beanstalk
print_status "Deploying to Elastic Beanstalk..."

# Check if EB CLI is available
if ! command -v eb &> /dev/null; then
    print_error "EB CLI not found. Please install it with: pip install awsebcli"
    exit 1
fi

# Deploy the application
print_status "Uploading to Elastic Beanstalk environment..."
eb deploy --timeout 20

if [ $? -eq 0 ]; then
    print_success "✓ Deployment completed successfully!"
    
    # Step 4: Check application health
    print_status "Checking application health..."
    sleep 30  # Wait for deployment to settle
    
    # Get environment info
    ENV_INFO=$(eb status --verbose)
    if echo "$ENV_INFO" | grep -q "Health: Ok"; then
        print_success "✓ Application is healthy!"
    elif echo "$ENV_INFO" | grep -q "Health: Warning"; then
        print_warning "⚠ Application deployed but has warnings"
    else
        print_error "✗ Application may have health issues"
    fi
    
    # Display environment URL
    ENV_URL=$(echo "$ENV_INFO" | grep "CNAME:" | awk '{print $2}')
    if [ ! -z "$ENV_URL" ]; then
        print_success "🌐 Application URL: http://$ENV_URL"
        print_status "Testing health endpoint..."
        
        if curl -f -s "http://$ENV_URL/health/" > /dev/null; then
            print_success "✓ Health endpoint is responding"
        else
            print_warning "⚠ Health endpoint may not be responding yet"
        fi
    fi
    
else
    print_error "✗ Deployment failed"
    print_status "Checking logs for errors..."
    eb logs --all
    exit 1
fi

# Step 5: Clean up
print_status "Cleaning up deployment package..."
rm -f "$DEPLOY_ZIP"

print_success "🎉 Deployment completed!"
print_status "Key fixes applied:"
print_status "  - Changed ProxyServer from 'apache' to 'nginx'"
print_status "  - Removed WSGIPath configurations (Docker uses gunicorn directly)"
print_status "  - Updated ALLOWED_HOSTS to allow AWS internal IPs"
print_status ""
print_status "Monitor the application logs with: eb logs"
print_status "Check application status with: eb status" 