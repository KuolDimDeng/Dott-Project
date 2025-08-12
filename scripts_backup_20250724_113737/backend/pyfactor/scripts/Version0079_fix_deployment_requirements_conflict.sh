#!/bin/bash

# Version 0079: Fix Deployment Requirements Conflict
# Date: 2025-05-29
# Issue: Missing requirements.txt and psycopg2-binary version conflict
# 
# Problems identified from AWS logs:
# 1. ERROR: "/requirements.txt": not found
# 2. ERROR: Cannot install psycopg2-binary==2.9.6 and psycopg2-binary==2.9.9

set -e

echo "=== Version 0079: Fixing Deployment Requirements Conflict ==="

# Set variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSION_LABEL="OAuth-Requirements-Fixed-${TIMESTAMP}"

echo "🔍 Current directory: $(pwd)"

# Step 1: Create backup of current requirements
echo "📋 Creating backup of current requirements..."
if [ -f "requirements-eb.txt" ]; then
    cp requirements-eb.txt "requirements-eb.txt.backup_${TIMESTAMP}"
    echo "✅ Backed up requirements-eb.txt"
fi

# Step 2: Fix psycopg2-binary version conflict
echo "🔧 Fixing psycopg2-binary version conflict..."
# Remove any conflicting versions and standardize on 2.9.9
sed -i '/psycopg2-binary==2\.9\.6/d' requirements-eb.txt 2>/dev/null || true
sed -i '/psycopg2-binary==2\.9\.7/d' requirements-eb.txt 2>/dev/null || true
sed -i '/psycopg2-binary==2\.9\.8/d' requirements-eb.txt 2>/dev/null || true

# Ensure we have only one psycopg2-binary version
if ! grep -q "psycopg2-binary==2.9.9" requirements-eb.txt; then
    echo "psycopg2-binary==2.9.9" >> requirements-eb.txt
fi

# Remove duplicate entries
sort requirements-eb.txt | uniq > requirements-eb.txt.tmp
mv requirements-eb.txt.tmp requirements-eb.txt

echo "✅ Fixed psycopg2-binary version to 2.9.9"

# Step 3: Create requirements.txt (what Dockerfile expects)
echo "📝 Creating requirements.txt for Dockerfile compatibility..."
cp requirements-eb.txt requirements.txt
echo "✅ Created requirements.txt identical to requirements-eb.txt"

# Step 4: Verify no conflicts exist
echo "🔍 Verifying no dependency conflicts..."
PSYCOPG_COUNT=$(grep -c "psycopg2-binary==" requirements.txt || echo "0")
if [ "$PSYCOPG_COUNT" -gt 1 ]; then
    echo "❌ ERROR: Multiple psycopg2-binary versions found!"
    grep "psycopg2-binary==" requirements.txt
    exit 1
fi

echo "✅ Dependencies verified - no conflicts found"

# Step 5: Update Dockerfile to be more flexible
echo "🐳 Creating deployment-optimized Dockerfile..."
cat > Dockerfile.deployment << 'EOF'
FROM python:3.12-slim

# Set working directory
WORKDIR /var/app/current

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    netcat-traditional \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install build tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy requirements first to leverage Docker cache
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Start command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "pyfactor.wsgi:application"]
EOF

echo "✅ Created deployment-optimized Dockerfile"

# Step 6: Create deployment package
echo "📦 Creating deployment package..."
rm -rf deployment_package_oauth_fixed/
mkdir -p deployment_package_oauth_fixed/

# Copy all necessary files
echo "📋 Copying application files..."
cp -r . deployment_package_oauth_fixed/ 2>/dev/null || true

# Exclude unnecessary files from deployment
cd deployment_package_oauth_fixed/
rm -rf \
    .git* \
    __pycache__/ \
    *.pyc \
    *.pyo \
    *.pyd \
    .Python \
    env/ \
    venv/ \
    .venv/ \
    pip-log.txt \
    pip-delete-this-directory.txt \
    .tox/ \
    .coverage \
    .coverage.* \
    .cache \
    nosetests.xml \
    coverage.xml \
    *.cover \
    *.log \
    .DS_Store \
    Thumbs.db \
    deployment_package*/ \
    scripts/

# Use the optimized Dockerfile
mv Dockerfile.deployment Dockerfile

echo "✅ Deployment package created"

# Step 7: Create version
cd ..
echo "🚀 Creating application version..."
zip -r "oauth-requirements-fixed-${TIMESTAMP}.zip" deployment_package_oauth_fixed/ > /dev/null

aws s3 cp "oauth-requirements-fixed-${TIMESTAMP}.zip" s3://elasticbeanstalk-us-east-1-471112661935/ \
    --region us-east-1

aws elasticbeanstalk create-application-version \
    --application-name "Dott" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="elasticbeanstalk-us-east-1-471112661935",S3Key="oauth-requirements-fixed-${TIMESTAMP}.zip" \
    --region us-east-1

echo "✅ Application version created: $VERSION_LABEL"

# Step 8: Deploy to environment
echo "🚀 Deploying to Dott-env-fixed..."
aws elasticbeanstalk update-environment \
    --environment-name "Dott-env-fixed" \
    --version-label "$VERSION_LABEL" \
    --region us-east-1

echo "✅ Deployment initiated!"
echo ""
echo "🎯 Next steps:"
echo "1. Monitor deployment: aws elasticbeanstalk describe-environments --environment-names Dott-env-fixed --region us-east-1"
echo "2. Check logs if needed: aws elasticbeanstalk request-environment-info --environment-name Dott-env-fixed --info-type tail --region us-east-1"
echo "3. Test OAuth endpoints after deployment completes"
echo ""
echo "📝 Deployment Details:"
echo "   Version Label: $VERSION_LABEL"
echo "   Package: oauth-requirements-fixed-${TIMESTAMP}.zip"
echo "   Fixed Issues: Missing requirements.txt + psycopg2-binary conflict"

# Cleanup
rm -f "oauth-requirements-fixed-${TIMESTAMP}.zip"
rm -rf deployment_package_oauth_fixed/

echo "✅ Version 0079 deployment script completed!"
