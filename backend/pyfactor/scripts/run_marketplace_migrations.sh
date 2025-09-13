#!/bin/bash

# Script to run migrations for marketplace and advertising improvements
# Run this on staging/production after testing locally

echo "======================================"
echo "Running Marketplace & Advertising Migrations"
echo "======================================"

# Navigate to project directory
cd /Users/kuoldeng/projectx/backend/pyfactor

# Run migrations for each app
echo ""
echo "1. Running marketplace migrations..."
python3 manage.py migrate marketplace

echo ""
echo "2. Running advertising migrations..."
python3 manage.py migrate advertising

echo ""
echo "3. Running users migrations (for currency fields)..."
python3 manage.py migrate users

echo ""
echo "4. Checking migration status..."
python3 manage.py showmigrations marketplace advertising users | grep -E "(marketplace|advertising|users)"

echo ""
echo "======================================"
echo "Migrations Complete!"
echo "======================================"

echo ""
echo "Next steps:"
echo "1. Test the advertising to marketplace flow:"
echo "   python3 scripts/test_advertising_marketplace_flow.py"
echo ""
echo "2. Check for any issues in the logs"
echo ""
echo "3. Deploy to staging for testing"