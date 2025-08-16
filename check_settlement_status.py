#!/usr/bin/env python3
"""
Check POS payment settlement status
"""
import os
import sys
import django
from datetime import datetime, timedelta

# Add project to path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from banking.models import PaymentSettlement
from django.utils import timezone

print("=" * 60)
print("POS PAYMENT SETTLEMENT STATUS CHECK")
print("=" * 60)

# Get recent settlements (last 24 hours)
since = timezone.now() - timedelta(hours=24)
settlements = PaymentSettlement.objects.filter(
    created_at__gte=since
).order_by('-created_at')

if not settlements:
    print("No settlements found in the last 24 hours")
else:
    print(f"\nFound {settlements.count()} settlement(s) in the last 24 hours:\n")
    
    for settlement in settlements[:10]:  # Show last 10
        print(f"Settlement ID: {settlement.id}")
        print(f"  Created: {settlement.created_at}")
        print(f"  Status: {settlement.status}")
        print(f"  Stripe Payment Intent: {settlement.stripe_payment_intent_id}")
        print(f"  Amount: {settlement.original_amount} {settlement.currency}")
        print(f"  Stripe Fee: ${settlement.stripe_fee}")
        print(f"  Platform Fee: ${settlement.platform_fee}")
        print(f"  Settlement Amount: ${settlement.settlement_amount}")
        print(f"  User: {settlement.user.email}")
        
        if settlement.wise_transfer_id:
            print(f"  ✅ Wise Transfer ID: {settlement.wise_transfer_id}")
            print(f"  User Receives: ${settlement.user_receives}")
            print(f"  Completed At: {settlement.completed_at}")
        else:
            print(f"  ⏳ Awaiting Wise transfer (will be processed in daily batch)")
        
        if settlement.bank_account:
            print(f"  Bank Account: {settlement.bank_account}")
        
        print("-" * 40)

# Check for the specific payment intent from the logs
payment_intent_id = "pi_3RwrVaFls6i75mQB0FX9TKpC"
print(f"\nChecking for specific payment intent: {payment_intent_id}")
try:
    specific_settlement = PaymentSettlement.objects.get(
        stripe_payment_intent_id=payment_intent_id
    )
    print(f"✅ Found settlement for this payment!")
    print(f"  Status: {specific_settlement.status}")
    print(f"  Amount: ${specific_settlement.settlement_amount} to be transferred")
    if specific_settlement.status == 'pending':
        print(f"  ⏳ Settlement is pending - will be processed in next batch run")
    elif specific_settlement.status == 'processing':
        print(f"  🔄 Settlement is being processed")
    elif specific_settlement.status == 'completed':
        print(f"  ✅ Settlement completed!")
except PaymentSettlement.DoesNotExist:
    print(f"❌ No settlement found for payment intent: {payment_intent_id}")

print("\n" + "=" * 60)
print("NOTE: Settlements are processed in batches, typically daily.")
print("To manually trigger settlement processing, run:")
print("  python manage.py process_settlements")
print("=" * 60)