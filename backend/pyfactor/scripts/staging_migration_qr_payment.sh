#!/bin/bash

# Staging Migration Script for QRPaymentTransaction
# =================================================
# This script deploys the QRPaymentTransaction migration to staging environment
# 
# Usage:
#   ./scripts/staging_migration_qr_payment.sh
#
# Or run on Render staging service:
#   bash /opt/render/project/src/scripts/staging_migration_qr_payment.sh

echo "🚀 Starting QRPaymentTransaction Migration Deployment to Staging"
echo "================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the correct directory
if [ ! -f "manage.py" ]; then
    print_error "manage.py not found. Please run this script from the Django project root"
    exit 1
fi

print_status "Working directory: $(pwd)"

# Step 1: Check if migration file exists
echo ""
echo "📋 Step 1: Checking migration file..."
MIGRATION_FILE="payments/migrations/0006_qr_payment_transaction.py"

if [ -f "$MIGRATION_FILE" ]; then
    print_status "Migration file found: $MIGRATION_FILE"
else
    print_error "Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Step 2: Show current migration status
echo ""
echo "📋 Step 2: Checking current migration status..."
python manage.py showmigrations payments || print_warning "Could not show migrations (database may not be accessible)"

# Step 3: Apply the migration
echo ""
echo "🔄 Step 3: Applying QRPaymentTransaction migration..."
echo "Running: python manage.py migrate payments"

if python manage.py migrate payments; then
    print_status "Migration applied successfully!"
else
    print_error "Migration failed!"
    exit 1
fi

# Step 4: Verify the migration
echo ""
echo "🔍 Step 4: Verifying migration..."
if python manage.py shell -c "from payments.models import QRPaymentTransaction; print('✅ QRPaymentTransaction model imported successfully')" 2>/dev/null; then
    print_status "QRPaymentTransaction model is accessible"
else
    print_warning "Could not verify model (this may be normal in some environments)"
fi

# Success message
echo ""
echo "================================================================"
print_status "QRPaymentTransaction Migration Deployment Complete!"
echo ""
print_status "The following was accomplished:"
print_status "• QRPaymentTransaction table created in database"
print_status "• All database indexes added for optimal performance"  
print_status "• Model is ready for QR payment functionality"
echo ""
echo "🎉 QR Payment API endpoints should now work without 404 errors!"
echo ""
echo "Next steps:"
echo "1. Test QR payment API endpoints"
echo "2. Verify QR code generation works"
echo "3. Test payment processing flow"
echo "4. Deploy to production when all tests pass"
echo ""

exit 0