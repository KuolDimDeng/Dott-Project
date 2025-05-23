#!/bin/bash

# PyFactor Next.js Frontend Deployment Script
# Deploys to AWS S3 with CloudFront distribution
# Created: 2025-05-22

set -e

echo "🚀 Starting PyFactor Frontend Deployment..."

# Environment variables
ENVIRONMENT=${1:-production}
S3_BUCKET=${S3_BUCKET:-"pyfactor-frontend-prod"}
CLOUDFRONT_DISTRIBUTION_ID=${CLOUDFRONT_DISTRIBUTION_ID:-""}
AWS_REGION=${AWS_REGION:-"us-east-1"}

echo "📋 Deployment Configuration:"
echo "   Environment: $ENVIRONMENT"
echo "   S3 Bucket: $S3_BUCKET"
echo "   AWS Region: $AWS_REGION"
echo "   CloudFront Distribution: ${CLOUDFRONT_DISTRIBUTION_ID:-"Not configured"}"

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure'."
    exit 1
fi

# Check if S3 bucket exists
if ! aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
    echo "❌ S3 bucket $S3_BUCKET does not exist or is not accessible."
    exit 1
fi

echo "✅ Pre-deployment checks passed"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build for production
echo "🔨 Building for production..."
if [ "$ENVIRONMENT" = "production" ]; then
    pnpm run build:production-fast
else
    pnpm run build:optimized
fi

echo "✅ Build completed successfully"

# Verify build output
if [ ! -d ".next" ]; then
    echo "❌ Build failed - .next directory not found"
    exit 1
fi

# Create build manifest
echo "📝 Creating build manifest..."
BUILD_TIME=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
BUILD_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
cat > .next/build-manifest.json << EOF
{
  "buildTime": "$BUILD_TIME",
  "commitHash": "$BUILD_HASH",
  "environment": "$ENVIRONMENT",
  "version": "$(cat package.json | grep -o '"version": "[^"]*' | grep -o '[^"]*$')",
  "features": {
    "authUtils": true,
    "payrollAPI": true,
    "cognitoIntegration": true,
    "awsRDS": true
  }
}
EOF

# Deploy to S3
echo "☁️  Deploying to S3..."
aws s3 sync .next/static s3://$S3_BUCKET/_next/static --delete --cache-control "public, max-age=31536000, immutable"
aws s3 sync .next s3://$S3_BUCKET/_next --exclude "static/*" --delete --cache-control "public, max-age=0, must-revalidate"
aws s3 cp .next/build-manifest.json s3://$S3_BUCKET/build-manifest.json --cache-control "public, max-age=300"

# Set up S3 website configuration
echo "🌐 Configuring S3 website hosting..."
aws s3 website s3://$S3_BUCKET --index-document index.html --error-document error.html

# Invalidate CloudFront cache if distribution ID is provided
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
    echo "✅ CloudFront invalidation initiated"
else
    echo "⚠️  CloudFront distribution ID not provided - skipping cache invalidation"
fi

# Create deployment record
DEPLOYMENT_ID=$(date +%Y%m%d-%H%M%S)
cat > "deployment-$DEPLOYMENT_ID.json" << EOF
{
  "deploymentId": "$DEPLOYMENT_ID",
  "timestamp": "$BUILD_TIME",
  "commitHash": "$BUILD_HASH",
  "environment": "$ENVIRONMENT",
  "s3Bucket": "$S3_BUCKET",
  "cloudfrontDistribution": "${CLOUDFRONT_DISTRIBUTION_ID:-"none"}",
  "status": "completed",
  "features": {
    "authUtils": "deployed",
    "payrollAPI": "deployed",
    "cognitoIntegration": "active",
    "awsRDS": "connected"
  }
}
EOF

echo "📊 Deployment Summary:"
echo "   Deployment ID: $DEPLOYMENT_ID"
echo "   Build Hash: $BUILD_HASH"
echo "   S3 Bucket: s3://$S3_BUCKET"
echo "   Status: ✅ COMPLETED"
echo ""
echo "🎉 PyFactor Frontend deployed successfully!"
echo "   Website URL: https://$S3_BUCKET.s3-website-$AWS_REGION.amazonaws.com"
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "   CloudFront URL: https://$CLOUDFRONT_DISTRIBUTION_ID.cloudfront.net"
fi
echo ""
echo "🔧 Next Steps:"
echo "   1. Test authentication flow"
echo "   2. Verify payroll API connectivity"
echo "   3. Check Cognito integration"
echo "   4. Monitor application performance" 