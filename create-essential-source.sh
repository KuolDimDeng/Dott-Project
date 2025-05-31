#!/bin/bash

# Create essential source package for CodeBuild
set -e

echo "🚀 Creating essential-only source package..."

# Create temporary directory
TEMP_DIR="/tmp/dott-essential-source"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR/backend/pyfactor

# Copy only essential files
echo "📁 Copying only essential files..."

# Copy buildspec.yml
cp /Users/kuoldeng/projectx/buildspec.yml $TEMP_DIR/

# Copy Django core files
cp /Users/kuoldeng/projectx/backend/pyfactor/manage.py $TEMP_DIR/backend/pyfactor/
cp /Users/kuoldeng/projectx/backend/pyfactor/Dockerfile $TEMP_DIR/backend/pyfactor/
cp /Users/kuoldeng/projectx/backend/pyfactor/requirements-eb.txt $TEMP_DIR/backend/pyfactor/

# Copy Django project directory
mkdir -p $TEMP_DIR/backend/pyfactor/pyfactor
rsync -av --exclude='__pycache__' /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/ $TEMP_DIR/backend/pyfactor/pyfactor/

# Copy essential app directories (only Python files)
for app in users health; do
    if [ -d "/Users/kuoldeng/projectx/backend/pyfactor/$app" ]; then
        mkdir -p $TEMP_DIR/backend/pyfactor/$app
        find /Users/kuoldeng/projectx/backend/pyfactor/$app -name "*.py" -exec cp --parents {} $TEMP_DIR/backend/pyfactor/ \;
    fi
done

# Create empty directories that might be needed
mkdir -p $TEMP_DIR/backend/pyfactor/static
mkdir -p $TEMP_DIR/backend/pyfactor/media
mkdir -p $TEMP_DIR/backend/pyfactor/staticfiles

echo "📊 Essential source package contents:"
find $TEMP_DIR -name "*.py" | head -10
echo ""
echo "📏 Essential source package size:"
du -sh $TEMP_DIR

# Create tarball
cd $TEMP_DIR
tar -czf /tmp/dott-essential-source.tar.gz .
cd -

echo "📏 Compressed size:"
du -sh /tmp/dott-essential-source.tar.gz

echo "✅ Essential source package created: /tmp/dott-essential-source.tar.gz"

# List key files for verification
echo ""
echo "🔍 Key files included:"
tar -tzf /tmp/dott-essential-source.tar.gz | grep -E "(Dockerfile|manage.py|buildspec.yml|settings|wsgi)" | head -10

# Cleanup
rm -rf $TEMP_DIR