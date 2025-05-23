#!/bin/bash

# Simple Deploy to dottapps.com
# Deploy your Dott app directly to the S3 bucket

echo "🚀 Deploying Dott App to https://dottapps.com"
echo "============================================="

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

# Known S3 bucket for dottapps.com
S3_BUCKET="dottapps.com"

print_status "Using S3 bucket: $S3_BUCKET"

# Step 1: Build the app for production
print_status "Building Dott app for production..."

# Set production environment variables
export NEXT_PUBLIC_API_URL="https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production"
export NODE_ENV="production"
export USE_DATABASE="true"
export MOCK_DATA_DISABLED="true"
export PROD_MODE="true"

# Copy production config
cp next.config.production.js next.config.js

# Build the app
print_status "Running pnpm build..."
pnpm run build

if [ $? -ne 0 ]; then
    print_error "Build failed!"
    exit 1
fi

print_success "Build completed successfully!"

# Step 2: Check what we built
if [ -d ".next/out" ]; then
    BUILD_DIR=".next/out"
    print_success "Using static export from .next/out"
elif [ -d "out" ]; then
    BUILD_DIR="out"
    print_success "Using static export from out"
elif [ -d ".next" ]; then
    BUILD_DIR=".next"
    print_success "Using Next.js build output"
else
    print_error "No build output found!"
    exit 1
fi

print_status "Build directory: $BUILD_DIR"
print_status "Files in build directory:"
ls -la $BUILD_DIR | head -10

# Step 3: Deploy to S3
print_status "Deploying to S3 bucket: s3://$S3_BUCKET/"

# Test S3 access first
aws s3 ls s3://$S3_BUCKET/ > /dev/null
if [ $? -ne 0 ]; then
    print_error "Cannot access S3 bucket: $S3_BUCKET"
    print_error "Check your AWS credentials and permissions"
    exit 1
fi

print_success "S3 bucket access confirmed"

# Sync files to S3
print_status "Uploading files..."

aws s3 sync $BUILD_DIR s3://$S3_BUCKET/ \
    --delete \
    --exclude "*.map" \
    --cache-control "public, max-age=31536000"

if [ $? -ne 0 ]; then
    print_error "Failed to sync files to S3!"
    exit 1
fi

# Set special cache control for HTML files (short cache)
print_status "Setting cache control for HTML files..."
aws s3 cp s3://$S3_BUCKET/ s3://$S3_BUCKET/ \
    --recursive \
    --exclude "*" \
    --include "*.html" \
    --cache-control "public, max-age=0, s-maxage=60" \
    --metadata-directive REPLACE

print_success "Files uploaded to S3 successfully!"

# Step 4: Try to find and invalidate CloudFront
print_status "Looking for CloudFront distribution..."

# Try to find distribution ID by looking at origin domain
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='$S3_BUCKET.s3.amazonaws.com']].Id" --output text 2>/dev/null)

if [ ! -z "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    print_success "Found CloudFront distribution: $DISTRIBUTION_ID"
    print_status "Invalidating CloudFront cache..."
    
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id $DISTRIBUTION_ID \
        --paths "/*" \
        --query "Invalidation.Id" \
        --output text)
    
    if [ $? -eq 0 ]; then
        print_success "CloudFront invalidation created: $INVALIDATION_ID"
    else
        print_warning "CloudFront invalidation failed"
    fi
else
    print_warning "CloudFront distribution not found or not accessible"
    print_status "The site may take longer to update due to cached content"
fi

# Step 5: Deployment summary
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
print_success "Your Dott app has been deployed to: https://dottapps.com"
print_success "S3 Bucket: s3://$S3_BUCKET/"
print_success "API Gateway: https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production"

echo ""
print_status "What happens next:"
echo "1. ✅ Files are now uploaded to S3"
echo "2. 🔄 CloudFront cache may take 5-15 minutes to update"
echo "3. 🌐 Visit https://dottapps.com to see your app"

echo ""
print_status "If you still see the old welcome page:"
echo "- Wait 5-15 minutes for CloudFront to update"
echo "- Try hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)"
echo "- Try incognito/private browsing mode"

echo ""
print_success "🚀 Deployment successful! Your Dott app should be live soon!" 