#!/bin/bash

# =============================================================================
# 🚀 Deploy Django App to AWS App Runner
# =============================================================================
# This script builds and deploys your Django application to AWS App Runner
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="471112661935"
ECR_REPOSITORY="dott-backend"
IMAGE_TAG="latest"
APP_RUNNER_SERVICE="dott-backend"

# Derived variables
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"
FULL_IMAGE_URI="${ECR_URI}:${IMAGE_TAG}"

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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install Docker Desktop"
    exit 1
fi

# Check if Docker daemon is running
if ! docker ps &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker Desktop"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run: aws configure"
    exit 1
fi

print_success "All prerequisites met"

# =============================================================================
# Docker Build and Push
# =============================================================================

print_header "🏗️  BUILDING DOCKER IMAGE"

# Authenticate Docker with ECR
print_info "Authenticating with ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI} || {
    print_warning "ECR login failed, trying alternative method..."
    # Alternative login method for older Docker versions
    $(aws ecr get-login --no-include-email --region ${AWS_REGION})
}

print_success "ECR authentication successful"

# Build the Docker image
print_info "Building Docker image..."
docker build -t ${ECR_REPOSITORY}:${IMAGE_TAG} .

if [ $? -ne 0 ]; then
    print_error "Docker build failed"
    exit 1
fi

print_success "Docker image built successfully"

# Tag the image for ECR
print_info "Tagging image for ECR..."
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${FULL_IMAGE_URI}

# Push the image to ECR
print_info "Pushing image to ECR..."
docker push ${FULL_IMAGE_URI}

if [ $? -ne 0 ]; then
    print_error "Docker push failed"
    exit 1
fi

print_success "Image pushed to ECR: ${FULL_IMAGE_URI}"

# =============================================================================
# App Runner Service Management
# =============================================================================

print_header "🏃 MANAGING APP RUNNER SERVICE"

# Check if service exists
SERVICE_EXISTS=$(aws apprunner list-services --region ${AWS_REGION} --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE}'].ServiceName" --output text 2>/dev/null || echo "")

if [ -n "$SERVICE_EXISTS" ]; then
    print_info "App Runner service '${APP_RUNNER_SERVICE}' exists, triggering deployment..."
    
    # Trigger a new deployment
    aws apprunner start-deployment --service-arn $(aws apprunner list-services --region ${AWS_REGION} --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE}'].ServiceArn" --output text) --region ${AWS_REGION}
    
    print_success "Deployment triggered for existing service"
else
    print_warning "App Runner service '${APP_RUNNER_SERVICE}' does not exist"
    print_info "Please create the service in the AWS Console or use AWS CLI"
fi

# =============================================================================
# Verification
# =============================================================================

print_header "🔍 VERIFICATION"

print_info "Checking ECR image..."
aws ecr describe-images --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION} --query 'imageDetails[0].{Tags:imageTags,Pushed:imagePushedAt,Size:imageSizeInBytes}' --output table

if [ -n "$SERVICE_EXISTS" ]; then
    print_info "Checking App Runner service status..."
    aws apprunner describe-service --service-arn $(aws apprunner list-services --region ${AWS_REGION} --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE}'].ServiceArn" --output text) --region ${AWS_REGION} --query 'Service.{Status:Status,ServiceUrl:ServiceUrl,CreatedAt:CreatedAt}' --output table
fi

# =============================================================================
# Next Steps
# =============================================================================

print_header "🎉 DEPLOYMENT COMPLETE"

echo ""
print_success "Docker image successfully pushed to ECR!"
echo "Image URI: ${FULL_IMAGE_URI}"
echo ""

if [ -n "$SERVICE_EXISTS" ]; then
    print_success "App Runner deployment triggered!"
    echo ""
    print_info "Next steps:"
    echo "1. Monitor the deployment in AWS Console"
    echo "2. Check App Runner logs for any issues"
    echo "3. Test your application endpoint"
else
    print_info "To create the App Runner service:"
    echo "1. Go to AWS App Runner Console"
    echo "2. Create a new service"
    echo "3. Use container registry as source"
    echo "4. Specify image URI: ${FULL_IMAGE_URI}"
    echo "5. Configure environment variables as needed"
fi

echo ""
print_info "Useful commands:"
echo "- Monitor service: aws apprunner describe-service --service-arn <service-arn> --region ${AWS_REGION}"
echo "- View logs: Check CloudWatch logs in AWS Console"
echo "- List services: aws apprunner list-services --region ${AWS_REGION}" 