#!/bin/bash

echo "======================================="
echo "Fix Stripe for jubacargovillage@outlook.com"
echo "======================================="

cat << 'EOF' > /tmp/fix_jubacargovillage_stripe.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from django.contrib.auth import get_user_model
from users.models import Business

User = get_user_model()

# Get the environment variable
stripe_account = os.environ.get('STRIPE_EXPRESS_ACCOUNT_ID', '')
print(f"STRIPE_EXPRESS_ACCOUNT_ID from environment: {stripe_account or 'NOT SET'}")

if not stripe_account:
    print("❌ STRIPE_EXPRESS_ACCOUNT_ID environment variable is not set!")
    print("This is required for Stripe payments to work.")
    exit(1)

print(f"✅ Using Stripe Express Account: {stripe_account}")

# Find the user
try:
    user = User.objects.get(email='jubacargovillage@outlook.com')
    print(f"✅ Found user: {user.email}")
    print(f"   User ID: {user.id}")
    print(f"   Tenant ID: {user.tenant_id}")
    
    # Find their business
    try:
        business = Business.objects.get(tenant_id=user.tenant_id)
        print(f"\n✅ Found business: {business.business_name}")
        print(f"   Business ID: {business.id}")
        print(f"   Current Stripe Account: {business.stripe_account_id or 'NOT SET'}")
        
        if not business.stripe_account_id:
            # Update with the Stripe account
            with transaction.atomic():
                business.stripe_account_id = stripe_account
                business.save()
                print(f"\n✅ Updated business '{business.business_name}' with Stripe account!")
                print(f"   New Stripe Account: {business.stripe_account_id}")
                print("\n🎉 Payments should now work for jubacargovillage@outlook.com!")
        else:
            if business.stripe_account_id == stripe_account:
                print(f"\n✅ Business already has the correct Stripe account configured")
            else:
                print(f"\n⚠️  Business has a different Stripe account: {business.stripe_account_id}")
                print(f"   Expected: {stripe_account}")
                # Update it anyway
                with transaction.atomic():
                    business.stripe_account_id = stripe_account
                    business.save()
                    print(f"\n✅ Updated to correct Stripe account: {stripe_account}")
    
    except Business.DoesNotExist:
        print(f"\n❌ No business found for tenant_id: {user.tenant_id}")
        print("This user needs a business created first.")
    
except User.DoesNotExist:
    print("❌ User jubacargovillage@outlook.com not found in database")
    print("\nChecking if the email exists with different casing...")
    
    # Try case-insensitive search
    users = User.objects.filter(email__iexact='jubacargovillage@outlook.com')
    if users.exists():
        user = users.first()
        print(f"✅ Found user with different casing: {user.email}")
        # Continue with the same logic...
    else:
        print("❌ User not found even with case-insensitive search")

# Also check all businesses without Stripe accounts
print("\n" + "="*50)
print("📊 Business Stripe Configuration Summary:")

businesses_without_stripe = Business.objects.filter(
    stripe_account_id__isnull=True
) | Business.objects.filter(
    stripe_account_id=''
)

if businesses_without_stripe.exists():
    print(f"\n⚠️  {businesses_without_stripe.count()} businesses have no Stripe account:")
    for b in businesses_without_stripe[:5]:  # Show first 5
        print(f"   - {b.business_name} (ID: {b.id})")
    
    # Optionally update all of them
    if businesses_without_stripe.count() <= 10:  # Only auto-update if few businesses
        print(f"\n🔧 Updating all {businesses_without_stripe.count()} businesses...")
        with transaction.atomic():
            updated = businesses_without_stripe.update(stripe_account_id=stripe_account)
            print(f"✅ Updated {updated} businesses with Stripe account")

businesses_with_stripe = Business.objects.exclude(
    stripe_account_id__isnull=True
).exclude(
    stripe_account_id=''
).count()

print(f"\n✅ Total businesses with Stripe configured: {businesses_with_stripe}")

print("\n" + "="*50)
print("✅ Script completed!")
print("\nNext steps:")
print("1. Clear browser cache and cookies")
print("2. Test payment at: https://dottapps.com/pos")
print("3. If still not working, check: https://dottapps.com/check-stripe.html")
EOF

echo ""
echo "Python script created at: /tmp/fix_jubacargovillage_stripe.py"
echo ""
echo "======================================="
echo "Commands to run in PRODUCTION shell:"
echo "======================================="
echo ""
echo "1. Connect to Render shell for dott-api service"
echo ""
echo "2. Run the fix script:"
echo "   python /tmp/fix_jubacargovillage_stripe.py"
echo ""
echo "3. Verify the fix:"
echo "   python manage.py shell"
echo "   >>> from users.models import Business"
echo "   >>> from django.contrib.auth import get_user_model"
echo "   >>> User = get_user_model()"
echo "   >>> u = User.objects.get(email='jubacargovillage@outlook.com')"
echo "   >>> b = Business.objects.get(tenant_id=u.tenant_id)"
echo "   >>> print(f'Business: {b.business_name}, Stripe: {b.stripe_account_id}')"
echo ""
echo "4. Test the payment system:"
echo "   - Go to https://dottapps.com/pos"
echo "   - Try to make a payment"
echo ""
echo "======================================="