#!/bin/bash

echo "======================================="
echo "Diagnose Stripe Configuration Issue"
echo "======================================="
echo ""
echo "The diagnostic page shows Stripe key IS available via runtime config,"
echo "but the POS modal still shows 'Stripe publishable key not found'."
echo ""
echo "This script will help diagnose the issue."
echo ""

cat << 'EOF' > /tmp/diagnose_stripe.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.contrib.auth import get_user_model
from users.models import Business
import json

User = get_user_model()

print("="*60)
print("STRIPE CONFIGURATION DIAGNOSTIC")
print("="*60)

# 1. Check environment variables
print("\n1. ENVIRONMENT VARIABLES:")
print("-" * 40)
stripe_vars = {
    'STRIPE_SECRET_KEY': os.environ.get('STRIPE_SECRET_KEY', ''),
    'STRIPE_EXPRESS_ACCOUNT_ID': os.environ.get('STRIPE_EXPRESS_ACCOUNT_ID', ''),
    'STRIPE_WEBHOOK_SECRET': os.environ.get('STRIPE_WEBHOOK_SECRET', ''),
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': os.environ.get('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', '')
}

for key, value in stripe_vars.items():
    if value:
        if 'SECRET' in key or 'sk_' in value:
            display = value[:10] + '...' if len(value) > 10 else value
        else:
            display = value
        print(f"✅ {key}: {display}")
    else:
        print(f"❌ {key}: NOT SET")

# 2. Check business configurations
print("\n2. BUSINESS STRIPE CONFIGURATIONS:")
print("-" * 40)

# Check specific user
email = 'jubacargovillage@outlook.com'
try:
    user = User.objects.get(email=email)
    business = Business.objects.filter(tenant_id=user.tenant_id).first()
    if business:
        print(f"User: {email}")
        print(f"  Business: {business.business_name}")
        print(f"  Stripe Account: {business.stripe_account_id or 'NOT SET'}")
        if business.stripe_account_id:
            print(f"  ✅ This business HAS Stripe configured")
        else:
            print(f"  ❌ This business needs Stripe configuration")
    else:
        print(f"❌ No business found for user {email}")
except User.DoesNotExist:
    print(f"❌ User {email} not found")

# 3. Check all businesses
total_businesses = Business.objects.count()
with_stripe = Business.objects.exclude(stripe_account_id__isnull=True).exclude(stripe_account_id='').count()
without_stripe = total_businesses - with_stripe

print(f"\nTotal Businesses: {total_businesses}")
print(f"  With Stripe: {with_stripe}")
print(f"  Without Stripe: {without_stripe}")

# 4. Check database tables
print("\n3. DATABASE TABLES:")
print("-" * 40)

with connection.cursor() as cursor:
    tables_to_check = [
        'payments_paymentintent',
        'payments_transaction',
        'payments_paymentmethod',
        'payments_paymentsettlement',
        'pos_possale',
        'django_constance_config'
    ]
    
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
            print(f"  ✅ {table}: {count} records")
        else:
            print(f"  ❌ {table}: TABLE DOES NOT EXIST")

# 5. Check recent POS sales
print("\n4. RECENT POS SALES:")
print("-" * 40)

try:
    from pos.models import POSSale
    recent_sales = POSSale.objects.order_by('-created_at')[:5]
    if recent_sales:
        for sale in recent_sales:
            print(f"  Sale #{sale.id}: ${sale.total_amount} - {sale.payment_method} - {sale.created_at}")
    else:
        print("  No POS sales found")
except Exception as e:
    print(f"  Error checking POS sales: {e}")

# 6. Check payment intents
print("\n5. RECENT PAYMENT INTENTS:")
print("-" * 40)

try:
    from payments.models import PaymentIntent
    recent_intents = PaymentIntent.objects.order_by('-created_at')[:5]
    if recent_intents:
        for intent in recent_intents:
            print(f"  Intent: {intent.stripe_payment_intent_id} - ${intent.amount} - {intent.status}")
    else:
        print("  No payment intents found")
except Exception as e:
    print(f"  Error checking payment intents: {e}")

print("\n" + "="*60)
print("DIAGNOSTIC SUMMARY:")
print("="*60)

# Determine the likely issue
issues = []

if not stripe_vars['STRIPE_EXPRESS_ACCOUNT_ID']:
    issues.append("❌ STRIPE_EXPRESS_ACCOUNT_ID not set in environment")

if not stripe_vars['STRIPE_SECRET_KEY']:
    issues.append("❌ STRIPE_SECRET_KEY not set in environment")

if without_stripe > 0:
    issues.append(f"❌ {without_stripe} businesses have no Stripe account configured")

if issues:
    print("\nISSUES FOUND:")
    for issue in issues:
        print(f"  {issue}")
    
    print("\nRECOMMENDED FIXES:")
    if not stripe_vars['STRIPE_EXPRESS_ACCOUNT_ID']:
        print("  1. Set STRIPE_EXPRESS_ACCOUNT_ID in Render environment variables")
    if without_stripe > 0:
        print("  2. Run the fix script to update businesses with Stripe account")
else:
    print("\n✅ Backend configuration appears correct!")
    print("\nThe issue might be:")
    print("  1. Frontend caching - Clear browser cache and cookies")
    print("  2. React hydration - The component might not be reading runtime config properly")
    print("  3. Build issue - Frontend might need rebuild with env vars")

print("\n" + "="*60)
EOF

echo ""
echo "Diagnostic script created at: /tmp/diagnose_stripe.py"
echo ""
echo "======================================="
echo "To run diagnostics in PRODUCTION:"
echo "======================================="
echo ""
echo "1. Connect to Render shell for dott-api service"
echo ""
echo "2. Run the diagnostic:"
echo "   python /tmp/diagnose_stripe.py"
echo ""
echo "3. Based on the output, run the fix if needed:"
echo "   python /tmp/fix_jubacargovillage_stripe.py"
echo ""
echo "======================================="
echo "Frontend Debugging Steps:"
echo "======================================="
echo ""
echo "1. Open https://dottapps.com/pos in Chrome"
echo "2. Open DevTools Console (F12)"
echo "3. Run these commands in console:"
echo ""
echo "   // Check if runtime config is loaded"
echo "   console.log('Runtime Config:', window.__RUNTIME_CONFIG__);"
echo ""
echo "   // Check if Stripe key is available"
echo "   fetch('/api/runtime-config').then(r => r.json()).then(console.log);"
echo ""
echo "   // Check localStorage for any cached data"
echo "   console.log('LocalStorage:', localStorage);"
echo ""
echo "4. Clear cache and hard reload:"
echo "   - Chrome: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "   - Or: DevTools > Network tab > Disable cache checkbox"
echo ""
echo "======================================="