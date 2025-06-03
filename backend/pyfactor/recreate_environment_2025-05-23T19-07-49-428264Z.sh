#!/bin/bash
# Complete Environment Recreation Script
# Use this if proxy override still fails

set -e

echo "=== AWS Elastic Beanstalk Environment Recreation ==="
echo "⚠️  WARNING: This will TERMINATE and RECREATE your environment"
echo "⚠️  This will cause DOWNTIME while the new environment is created"
echo ""

read -p "Are you sure you want to proceed? Type 'YES' to confirm: " confirm

if [ "$confirm" != "YES" ]; then
    echo "❌ Operation cancelled"
    exit 1
fi

cd "/Users/kuoldeng/projectx/backend/pyfactor"

echo "📊 Current environment status:"
eb status

echo ""
echo "🚨 Terminating current environment..."
eb terminate DottApps-env --force

echo "⏳ Waiting for termination to complete..."
sleep 60

echo "🚀 Creating new environment with clean configuration..."
eb create DottApps-env \
    --platform docker \
    --instance-type t3.small \
    --single-instance \
    --region us-east-1 \
    --timeout 20

echo "⏳ Waiting for environment creation..."
sleep 120

echo "📊 New environment status:"
eb status
eb health

echo ""
echo "✅ Environment recreation completed"
echo "🔗 Test your backend: curl -k https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/"

echo ""
echo "⚠️  IMPORTANT: Update your DNS/domain settings if needed"
echo "The new environment may have a different URL endpoint"
