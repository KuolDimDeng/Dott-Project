#!/bin/bash

# Create minimal source package for CodeBuild
set -e

echo "🚀 Creating minimal source package..."

# Create temporary directory
TEMP_DIR="/tmp/dott-minimal-source"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

# Copy only essential files
echo "📁 Copying essential files..."

# Copy buildspec.yml
cp /Users/kuoldeng/projectx/buildspec.yml $TEMP_DIR/

# Copy backend directory structure
mkdir -p $TEMP_DIR/backend/pyfactor
rsync -av --exclude='__pycache__' --exclude='*.pyc' --exclude='node_modules' --exclude='.git' --exclude='staticfiles' --exclude='logs' --exclude='media' /Users/kuoldeng/projectx/backend/pyfactor/ $TEMP_DIR/backend/pyfactor/

echo "📊 Source package contents:"
find $TEMP_DIR -type f | head -20
echo ""
echo "📏 Source package size:"
du -sh $TEMP_DIR

# Create tarball
cd $TEMP_DIR
tar -czf /tmp/dott-minimal-source.tar.gz .
cd -

echo "📏 Compressed size:"
du -sh /tmp/dott-minimal-source.tar.gz

echo "✅ Minimal source package created: /tmp/dott-minimal-source.tar.gz"

# Cleanup
rm -rf $TEMP_DIR