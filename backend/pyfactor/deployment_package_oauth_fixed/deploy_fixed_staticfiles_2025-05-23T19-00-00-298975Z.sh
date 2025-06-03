#!/bin/bash
# EB Configuration Reset and Deployment Script
# Generated: 2025-05-23 19:00:00

set -e

echo "=== Elastic Beanstalk Static Files Fix Deployment ==="
echo "Timestamp: $(date)"
echo "Directory: /Users/kuoldeng/projectx/backend/pyfactor"

cd "/Users/kuoldeng/projectx/backend/pyfactor"

# Check if EB CLI is available
if ! command -v eb &> /dev/null; then
    echo "ERROR: EB CLI not found. Please install with 'pip install awsebcli'"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS CLI not configured. Please run 'aws configure'"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Initialize EB if needed
if [ ! -d ".elasticbeanstalk" ]; then
    echo "🔧 Initializing EB configuration..."
    eb init --platform docker --region us-east-1 DottApps
else
    echo "✅ EB already initialized"
fi

# Verify current environment
echo "📊 Current environment status:"
eb status || echo "⚠️  Environment may need initialization"

# Deploy with fixed configuration
echo "🚀 Starting deployment with fixed configuration..."
echo "This may take 5-10 minutes..."

# Stage all changes
git add .ebextensions/ Dockerrun.aws.json

# Deploy
eb deploy --staged --timeout 20

echo "⏳ Waiting for deployment to complete..."
sleep 30

# Check final status
echo "📊 Final deployment status:"
eb status
eb health

echo ""
echo "=== Deployment Complete ==="
echo "✅ Backend deployment should now be successful"
echo "🔗 Test your backend: curl -k https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/"
echo ""
echo "Next steps:"
echo "1. Verify backend health endpoint works"
echo "2. Re-enable frontend-backend connectivity"
echo "3. Test full application flow"
