#!/bin/bash

# Create final minimal source package for CodeBuild
set -e

echo "🚀 Creating final minimal source package..."

# Create temporary directory
TEMP_DIR="/tmp/dott-final-source"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR/backend/pyfactor

# Copy buildspec.yml
cp /Users/kuoldeng/projectx/buildspec.yml $TEMP_DIR/

# Copy essential Django files
cp /Users/kuoldeng/projectx/backend/pyfactor/manage.py $TEMP_DIR/backend/pyfactor/
cp /Users/kuoldeng/projectx/backend/pyfactor/Dockerfile $TEMP_DIR/backend/pyfactor/
cp /Users/kuoldeng/projectx/backend/pyfactor/requirements-eb.txt $TEMP_DIR/backend/pyfactor/

# Copy Django project directory completely
cp -r /Users/kuoldeng/projectx/backend/pyfactor/pyfactor $TEMP_DIR/backend/pyfactor/

# Copy essential apps with Python files only
for app in users health; do
    if [ -d "/Users/kuoldeng/projectx/backend/pyfactor/$app" ]; then
        mkdir -p $TEMP_DIR/backend/pyfactor/$app
        find /Users/kuoldeng/projectx/backend/pyfactor/$app -name "*.py" -exec sh -c 'mkdir -p "$2/$(dirname "$1")" && cp "$1" "$2/$1"' _ {} $TEMP_DIR/backend/pyfactor \;
    fi
done

# Create essential empty directories
mkdir -p $TEMP_DIR/backend/pyfactor/static
mkdir -p $TEMP_DIR/backend/pyfactor/media
mkdir -p $TEMP_DIR/backend/pyfactor/staticfiles

# Clean up unnecessary files
find $TEMP_DIR -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find $TEMP_DIR -name "*.pyc" -delete 2>/dev/null || true
find $TEMP_DIR -name ".DS_Store" -delete 2>/dev/null || true

echo "📊 Final source package contents:"
find $TEMP_DIR -name "*.py" | wc -l
echo "Python files included"

echo "📏 Final source package size:"
du -sh $TEMP_DIR

# Create tarball
cd $TEMP_DIR
tar -czf /tmp/dott-final-source.tar.gz .

echo "📏 Compressed size:"
du -sh /tmp/dott-final-source.tar.gz

echo "✅ Final source package created: /tmp/dott-final-source.tar.gz"

# List structure
echo ""
echo "🔍 Package structure:"
tar -tzf /tmp/dott-final-source.tar.gz | head -20

# Cleanup
rm -rf $TEMP_DIR