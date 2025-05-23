#!/bin/bash

# =============================================================================
# 🚀 SIMPLE AWS S3 + CLOUDFRONT DEPLOYMENT 
# =============================================================================
# Simpler alternative - deploys to S3 + CloudFront without Amplify CLI
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BUCKET_NAME="dottapps-frontend-$(date +%Y%m%d%H%M%S)"
AWS_REGION="us-east-1"
API_URL="http://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com"

print_header() {
    echo -e "${BLUE}============================================="
    echo " $1"
    echo "=============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# =============================================================================
# 1. Pre-flight checks
# =============================================================================
print_header "🔍 PRE-FLIGHT CHECKS"

if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured"
    exit 1
fi

print_success "AWS CLI ready"

# =============================================================================
# 2. Build the application
# =============================================================================
print_header "🔨 BUILDING APPLICATION"

# Set environment variables for build
export NEXT_PUBLIC_API_URL="$API_URL"
export BACKEND_API_URL="$API_URL"
export USE_DATABASE="true"
export MOCK_DATA_DISABLED="true"
export PROD_MODE="true"
export NODE_ENV="production"

# Copy production config
cp next.config.production.js next.config.js

print_info "Installing dependencies..."
NODE_ENV=development pnpm install

print_info "Building Next.js application..."
pnpm run build

print_success "Build completed"

# =============================================================================
# 3. Create S3 bucket
# =============================================================================
print_header "🪣 CREATING S3 BUCKET"

print_info "Creating bucket: $BUCKET_NAME"
aws s3 mb s3://"$BUCKET_NAME" --region "$AWS_REGION"

# Enable static website hosting
aws s3 website s3://"$BUCKET_NAME" \
    --index-document index.html \
    --error-document 404.html

# Set bucket policy for public read
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file://bucket-policy.json

print_success "S3 bucket configured"

# =============================================================================
# 4. Upload files
# =============================================================================
print_header "⬆️  UPLOADING FILES"

# Upload Next.js build output
aws s3 sync out/ s3://"$BUCKET_NAME"/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "service-worker.js"

# Upload HTML files with shorter cache
aws s3 sync out/ s3://"$BUCKET_NAME"/ \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" \
    --include "service-worker.js"

print_success "Files uploaded"

# =============================================================================
# 5. Get website URL
# =============================================================================
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"

print_header "🎉 DEPLOYMENT COMPLETE"

print_success "Your website is live at:"
echo "  $WEBSITE_URL"
echo ""
print_info "To set up custom domain:"
echo "1. Create CloudFront distribution pointing to this S3 bucket"
echo "2. Add CNAME record: dottapps.com → CloudFront domain"
echo ""
print_info "To clean up later:"
echo "aws s3 rb s3://$BUCKET_NAME --force"

# Cleanup
rm -f bucket-policy.json

# Open in browser
echo -e "${YELLOW}Open website in browser? (y/n): ${NC}"
read -r open_browser
if [[ $open_browser =~ ^[Yy]$ ]]; then
    open "$WEBSITE_URL" 2>/dev/null || xdg-open "$WEBSITE_URL" 2>/dev/null || echo "Please open: $WEBSITE_URL"
fi

print_success "🚀 SIMPLE DEPLOYMENT COMPLETE!" 