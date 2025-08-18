#!/bin/bash

echo "======================================="
echo "Complete Stripe Fix for Production"
echo "======================================="

cat << 'EOF' > /tmp/fix_stripe_production.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from users.models import Business

# Check environment variable
stripe_account = os.environ.get('STRIPE_EXPRESS_ACCOUNT_ID', '')
print(f"STRIPE_EXPRESS_ACCOUNT_ID: {stripe_account}")

if not stripe_account:
    print("❌ STRIPE_EXPRESS_ACCOUNT_ID environment variable is not set!")
    exit(1)

print(f"✅ Using Stripe Express Account: {stripe_account}")

# Update all businesses without Stripe accounts
with transaction.atomic():
    businesses = Business.objects.filter(
        stripe_account_id__isnull=True
    ) | Business.objects.filter(
        stripe_account_id=''
    )
    
    count = businesses.count()
    if count > 0:
        updated = businesses.update(stripe_account_id=stripe_account)
        print(f"✅ Updated {updated} businesses with Stripe account ID")
    else:
        # Check if any businesses exist at all
        total = Business.objects.count()
        if total == 0:
            print("⚠️  No businesses exist in the database")
        else:
            print(f"ℹ️  All {total} businesses already have Stripe accounts configured")
            # Show first business
            first = Business.objects.first()
            if first:
                print(f"   Example: {first.business_name} -> {first.stripe_account_id}")

# Verify the update
businesses_with_stripe = Business.objects.filter(
    stripe_account_id=stripe_account
).count()
print(f"\n✅ Total businesses with Stripe account '{stripe_account}': {businesses_with_stripe}")

# Check if payment tables exist
with connection.cursor() as cursor:
    # Check for key payment tables
    tables_to_check = [
        'payments_paymentintent',
        'payments_transaction', 
        'payments_paymentmethod',
        'pos_possale'
    ]
    
    print("\n📊 Payment Tables Status:")
    for table in tables_to_check:
        cursor.execute(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '{table}'
            );
        """)
        exists = cursor.fetchone()[0]
        if exists:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"   ✅ {table}: {count} records")
        else:
            print(f"   ❌ {table}: DOES NOT EXIST")

print("\n" + "="*50)
print("✅ Stripe configuration completed!")
print("\nNext steps:")
print("1. Clear cache in Render: Manual Deploy → 'Clear build cache & deploy'")
print("2. Test payment at: https://dottapps.com/pos")
print("3. Check diagnostics at: https://dottapps.com/check-stripe.html")
EOF

echo "Python script created at: /tmp/fix_stripe_production.py"
echo ""
echo "Commands to run in production shell:"
echo ""
echo "1. First, fix the migration issue:"
echo "   python manage.py migrate finance 0012_ensure_journalentryline_tenant_id --fake"
echo "   python manage.py migrate"
echo ""
echo "2. Then run the Stripe setup:"
echo "   python /tmp/fix_stripe_production.py"
echo ""
echo "3. Test the API:"
echo "   python manage.py shell"
echo "   >>> from users.models import Business"
echo "   >>> Business.objects.values('id', 'business_name', 'stripe_account_id').first()"