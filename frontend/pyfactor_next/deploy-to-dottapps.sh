#!/bin/bash

# Deploy Dott App to dottapps.com
# This script deploys your Next.js app to the S3 bucket serving dottapps.com

echo "🚀 Deploying Dott App to https://dottapps.com"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Find the S3 bucket for dottapps.com
print_status "Finding S3 bucket for dottapps.com..."

# Get CloudFront distributions and find the one serving dottapps.com
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, 'dottapps.com')].Id" --output text)

if [ -z "$DISTRIBUTION_ID" ]; then
    print_error "Could not find CloudFront distribution for dottapps.com"
    exit 1
fi

print_success "Found CloudFront distribution: $DISTRIBUTION_ID"

# Get the S3 bucket origin
S3_BUCKET=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query "Distribution.DistributionConfig.Origins.Items[0].DomainName" --output text | sed 's/.s3.amazonaws.com//')

if [ -z "$S3_BUCKET" ]; then
    print_error "Could not find S3 bucket from CloudFront distribution"
    exit 1
fi

print_success "Found S3 bucket: $S3_BUCKET"

# Step 2: Build the app for production
print_status "Building Dott app for production..."

# Ensure we have the production API URL
export NEXT_PUBLIC_API_URL="https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production"

# Copy production config
cp next.config.production.js next.config.js

# Build the app
pnpm run build

if [ $? -ne 0 ]; then
    print_error "Build failed!"
    exit 1
fi

print_success "Build completed successfully!"

# Step 3: Export the static app
print_status "Exporting static files..."

pnpm run export 2>/dev/null || echo "Export command not found, using build output directly"

# Determine output directory
if [ -d "out" ]; then
    BUILD_DIR="out"
    print_success "Using exported static files from 'out' directory"
elif [ -d ".next" ]; then
    BUILD_DIR=".next"
    print_success "Using build output from '.next' directory"
else
    print_error "No build output found!"
    exit 1
fi

# Step 4: Deploy to S3
print_status "Deploying to S3 bucket: $S3_BUCKET..."

# Sync the build output to S3
aws s3 sync $BUILD_DIR s3://$S3_BUCKET/ \
    --delete \
    --exclude "*.map" \
    --cache-control "public, max-age=31536000" \
    --metadata-directive REPLACE

if [ $? -ne 0 ]; then
    print_error "Failed to sync files to S3!"
    exit 1
fi

# Set special cache control for HTML files
aws s3 cp $BUILD_DIR s3://$S3_BUCKET/ \
    --recursive \
    --exclude "*" \
    --include "*.html" \
    --cache-control "public, max-age=0, s-maxage=2" \
    --metadata-directive REPLACE

print_success "Files uploaded to S3 successfully!"

# Step 5: Invalidate CloudFront cache
print_status "Invalidating CloudFront cache..."

INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)

if [ $? -eq 0 ]; then
    print_success "CloudFront invalidation created: $INVALIDATION_ID"
    print_status "Cache invalidation typically takes 3-5 minutes to complete"
else
    print_warning "CloudFront invalidation failed, but deployment was successful"
fi

# Step 6: Deployment summary
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
print_success "Your Dott app has been deployed to: https://dottapps.com"
print_success "S3 Bucket: $S3_BUCKET"
print_success "CloudFront Distribution: $DISTRIBUTION_ID"
print_success "API Gateway: https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production"

echo ""
print_status "Next steps:"
echo "1. Wait 3-5 minutes for CloudFront cache invalidation"
echo "2. Visit https://dottapps.com to see your live app"
echo "3. Test authentication and API functionality"
echo "4. Monitor usage in CloudWatch dashboard"

echo ""
print_status "If you see the old content, try:"
echo "- Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)"
echo "- Clear browser cache"
echo "- Wait a few more minutes for CDN propagation"

echo ""
print_success "🚀 Your Dott app is now live at https://dottapps.com!" 