#!/bin/bash

# Fix Stripe Configuration in Production
# This addresses the issue where Stripe works in staging but not production

echo "======================================="
echo "Fixing Stripe Configuration in Production"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}The database analysis shows:${NC}"
echo "1. No businesses have stripe_account_id configured (COUNT = 0)"
echo "2. The payments_paymentsettings table doesn't exist"
echo "3. The django_constance_config table doesn't exist"
echo ""

echo -e "${YELLOW}This indicates the production database is missing Stripe setup.${NC}"
echo ""

echo -e "${GREEN}Solution Steps:${NC}"
echo ""

echo "1. First, check if migrations are missing:"
echo -e "${YELLOW}python manage.py showmigrations payments | grep -E '\[ \]'${NC}"
echo ""

echo "2. Run any missing migrations:"
echo -e "${YELLOW}python manage.py migrate payments${NC}"
echo ""

echo "3. Check if the Stripe Express Account ID is configured:"
echo -e "${YELLOW}echo \$STRIPE_EXPRESS_ACCOUNT_ID${NC}"
echo ""

echo "4. If needed, create the default Stripe configuration:"
cat << 'EOF' > /tmp/setup_stripe_production.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from users.models import Business

# Check environment variable
stripe_account = os.environ.get('STRIPE_EXPRESS_ACCOUNT_ID', '')
print(f"STRIPE_EXPRESS_ACCOUNT_ID from environment: {stripe_account or 'NOT SET'}")

if not stripe_account:
    print("❌ STRIPE_EXPRESS_ACCOUNT_ID environment variable is not set!")
    print("This is required for Stripe payments to work.")
    print("Set it in Render Dashboard for dott-api service.")
else:
    print(f"✅ Stripe Express Account ID: {stripe_account}")
    
    # Update all businesses to use this Stripe account
    # (In production, you might want to be more selective)
    businesses = Business.objects.all()
    print(f"\nFound {businesses.count()} businesses")
    
    if businesses.exists():
        # Update the first business as a test
        first_business = businesses.first()
        if not first_business.stripe_account_id:
            first_business.stripe_account_id = stripe_account
            first_business.save()
            print(f"✅ Updated business '{first_business.business_name}' with Stripe account")
        else:
            print(f"Business '{first_business.business_name}' already has Stripe account: {first_business.stripe_account_id}")

# Check if payment settings table exists
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'payments_paymentsettings'
        );
    """)
    exists = cursor.fetchone()[0]
    
    if not exists:
        print("\n⚠️  payments_paymentsettings table doesn't exist.")
        print("Run: python manage.py migrate payments")
    else:
        print("\n✅ payments_paymentsettings table exists")

print("\n" + "="*50)
print("Next steps:")
print("1. Ensure STRIPE_EXPRESS_ACCOUNT_ID is set in Render")
print("2. Run migrations if needed: python manage.py migrate")
print("3. Test payment at https://dottapps.com/pos")
EOF

echo ""
echo -e "${BLUE}Python script created at: /tmp/setup_stripe_production.py${NC}"
echo "Run it with: python /tmp/setup_stripe_production.py"
echo ""

echo -e "${GREEN}Environment Variables to Check in Render:${NC}"
echo "Backend (dott-api):"
echo "  - STRIPE_SECRET_KEY (should start with sk_)"
echo "  - STRIPE_EXPRESS_ACCOUNT_ID (should start with acct_)"
echo "  - STRIPE_WEBHOOK_SECRET (should start with whsec_)"
echo ""
echo "Frontend (dott-front):"
echo "  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (should start with pk_)"
echo ""

echo -e "${YELLOW}Key Finding:${NC}"
echo "The production database has NO Stripe accounts configured for any business."
echo "This is why payments aren't working - the businesses need stripe_account_id set."
echo ""

echo -e "${GREEN}Quick Fix Commands:${NC}"
echo "1. In production shell, run these commands:"
echo ""
echo "# Check environment"
echo "echo \$STRIPE_SECRET_KEY | head -c 10"
echo "echo \$STRIPE_EXPRESS_ACCOUNT_ID"
echo ""
echo "# Run migrations"
echo "python manage.py migrate"
echo ""
echo "# Run the setup script"
echo "python /tmp/setup_stripe_production.py"
echo ""

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Script Complete!${NC}"
echo -e "${BLUE}=======================================${NC}"