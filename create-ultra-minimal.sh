#!/bin/bash

# Create ultra-minimal source with only Django essentials
set -e

echo "🚀 Creating ultra-minimal source package..."

TEMP_DIR="/tmp/dott-ultra-minimal"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

# Copy only essential files
cp /Users/kuoldeng/projectx/backend/pyfactor/manage.py $TEMP_DIR/
cp /Users/kuoldeng/projectx/backend/pyfactor/Dockerfile $TEMP_DIR/
cp /Users/kuoldeng/projectx/backend/pyfactor/requirements-eb.txt $TEMP_DIR/

# Copy only Django project core (minimal pyfactor directory)
mkdir -p $TEMP_DIR/pyfactor
cp /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/__init__.py $TEMP_DIR/pyfactor/
cp /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/settings_eb.py $TEMP_DIR/pyfactor/
cp /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/urls.py $TEMP_DIR/pyfactor/
cp /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/wsgi.py $TEMP_DIR/pyfactor/

# Copy health app (minimal)
mkdir -p $TEMP_DIR/health
cp /Users/kuoldeng/projectx/backend/pyfactor/health/__init__.py $TEMP_DIR/health/
cp /Users/kuoldeng/projectx/backend/pyfactor/health/views.py $TEMP_DIR/health/
cp /Users/kuoldeng/projectx/backend/pyfactor/health/urls.py $TEMP_DIR/health/

# Create empty directories
mkdir -p $TEMP_DIR/static
mkdir -p $TEMP_DIR/media
mkdir -p $TEMP_DIR/staticfiles

# Create minimal buildspec
cat > $TEMP_DIR/buildspec.yml << 'EOF'
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - REPOSITORY_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME
      - echo Repository URI is $REPOSITORY_URI
      - echo "Current directory structure:"
      - find . -type f -name "*.py" | head -10
  build:
    commands:
      - echo Building Docker image...
      - docker build -t $IMAGE_REPO_NAME:latest .
      - echo Tagging image for ECR...
      - docker tag $IMAGE_REPO_NAME:latest $REPOSITORY_URI:latest
  post_build:
    commands:
      - echo Pushing Docker image to ECR...
      - docker push $REPOSITORY_URI:latest
      - echo SUCCESS - Image pushed to $REPOSITORY_URI:latest
EOF

echo "📊 Ultra-minimal package contents:"
find $TEMP_DIR -name "*.py" | wc -l
echo "Python files"

echo "📏 Package size:"
du -sh $TEMP_DIR

# Create tarball
cd $TEMP_DIR
tar -czf /tmp/dott-ultra-minimal.tar.gz .

echo "📏 Compressed size:"
du -sh /tmp/dott-ultra-minimal.tar.gz

echo "✅ Ultra-minimal package created: /tmp/dott-ultra-minimal.tar.gz"

# List structure
echo ""
echo "🔍 Package structure:"
tar -tzf /tmp/dott-ultra-minimal.tar.gz

# Cleanup
rm -rf $TEMP_DIR