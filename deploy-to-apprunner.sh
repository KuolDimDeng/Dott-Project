#!/bin/bash

# AWS App Runner Deployment Script
# Run this script locally where you have Docker installed

set -e

echo "🚀 Starting AWS App Runner deployment..."
echo "================================================"

# Configuration
AWS_ACCOUNT_ID="471112661935"
AWS_REGION="us-east-1"
REPO_NAME="dott-backend"
IMAGE_TAG="latest"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}"

echo "📋 Configuration:"
echo "   AWS Account: $AWS_ACCOUNT_ID"
echo "   Region: $AWS_REGION"
echo "   Repository: $REPO_NAME"
echo "   ECR URI: $ECR_URI"
echo ""

# Step 1: Authenticate Docker with ECR
echo "🔐 Step 1: Authenticating Docker with ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

# Step 2: Build Docker image
echo "🏗️ Step 2: Building Docker image..."
cd backend/pyfactor
docker build -t $REPO_NAME:$IMAGE_TAG .
cd ../..

# Step 3: Tag image for ECR
echo "🏷️ Step 3: Tagging image for ECR..."
docker tag $REPO_NAME:$IMAGE_TAG $ECR_URI:$IMAGE_TAG

# Step 4: Push to ECR
echo "📤 Step 4: Pushing image to ECR..."
docker push $ECR_URI:$IMAGE_TAG

echo ""
echo "✅ Docker image pushed successfully!"
echo "📍 Image URI: $ECR_URI:$IMAGE_TAG"
echo ""
echo "🎯 Next step: Create App Runner service with this image URI"
echo "   You can do this through the AWS Console or CLI"
echo ""
echo "💡 App Runner service configuration:"
echo "   - Source: Container registry"
echo "   - Image URI: $ECR_URI:$IMAGE_TAG"
echo "   - Port: 8000"
echo "   - Health check: /health/"
echo ""