#!/bin/bash

# Create source with Dockerfile at root for easier building
set -e

echo "🚀 Creating root-level Dockerfile source..."

# Create temporary directory
TEMP_DIR="/tmp/dott-root-source"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

# Copy entire backend/pyfactor contents to root
cp -r /Users/kuoldeng/projectx/backend/pyfactor/* $TEMP_DIR/

# Create root-level buildspec
cat > $TEMP_DIR/buildspec.yml << 'EOF'
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - REPOSITORY_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME
      - echo Repository URI is $REPOSITORY_URI
      - echo Current directory contents:
      - ls -la
  build:
    commands:
      - echo Building Docker image...
      - docker build -t $IMAGE_REPO_NAME:latest .
      - echo Tagging image for ECR...
      - docker tag $IMAGE_REPO_NAME:latest $REPOSITORY_URI:latest
      - echo Listing local Docker images...
      - docker images
  post_build:
    commands:
      - echo Pushing Docker image to ECR...
      - docker push $REPOSITORY_URI:latest
      - echo Image pushed successfully to $REPOSITORY_URI:latest
EOF

# Clean up unnecessary files
find $TEMP_DIR -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find $TEMP_DIR -name "*.pyc" -delete 2>/dev/null || true
find $TEMP_DIR -name ".DS_Store" -delete 2>/dev/null || true

echo "📊 Root-level source package contents:"
ls -la $TEMP_DIR | head -10

echo "📏 Root-level source package size:"
du -sh $TEMP_DIR

# Create tarball
cd $TEMP_DIR
tar -czf /tmp/dott-root-source.tar.gz .

echo "📏 Compressed size:"
du -sh /tmp/dott-root-source.tar.gz

echo "✅ Root-level source package created: /tmp/dott-root-source.tar.gz"

# Cleanup
rm -rf $TEMP_DIR