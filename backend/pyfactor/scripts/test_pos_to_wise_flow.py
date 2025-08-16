#!/usr/bin/env python3
"""
Test script for POS payment to Wise settlement flow
This simulates the complete flow from credit card payment to Wise transfer

Flow:
1. POS creates payment intent with metadata
2. Stripe webhook triggers on payment success
3. PaymentSettlement record is created
4. Settlement is processed via Wise API
"""

import os
import sys
import django
import json
import stripe
from decimal import Decimal

# Setup Django environment
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
from custom_auth.models import User
from users.models import UserProfile, Business
from banking.models import PaymentSettlement, WiseItem
from payments.webhook_handlers import handle_payment_intent_for_settlement
from banking.services.wise_service import WiseSettlementService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

def test_pos_payment_flow(user_email="kuoldimdeng@outlook.com"):
    """Test the complete POS to Wise settlement flow"""
    
    print("\n" + "="*60)
    print("POS PAYMENT TO WISE SETTLEMENT TEST")
    print("="*60)
    
    # Step 1: Get the test user
    try:
        user = User.objects.get(email=user_email)
        profile = UserProfile.objects.get(user=user)
        print(f"✓ Found user: {user.email} (ID: {user.id})")
        print(f"  Tenant ID: {profile.tenant_id}")
    except User.DoesNotExist:
        print(f"✗ User not found: {user_email}")
        return
    except UserProfile.DoesNotExist:
        print(f"✗ UserProfile not found for user: {user_email}")
        return
    
    # Step 2: Check if user has Wise account
    wise_item = WiseItem.objects.filter(user=user).first()
    if wise_item:
        print(f"✓ User has Wise account:")
        print(f"  Bank: {wise_item.bank_name}")
        print(f"  Country: {wise_item.bank_country}")
        print(f"  Verified: {wise_item.is_verified}")
        if not wise_item.is_verified:
            print("  ⚠️  Warning: Wise account not verified yet")
    else:
        print("✗ User doesn't have Wise account set up")
        print("  → User needs to set up Wise account in Settings > Banking")
    
    # Step 3: Simulate a POS payment
    print("\n--- Simulating POS Credit Card Payment ---")
    
    amount_cents = 10000  # $100.00
    currency = "usd"
    
    # Calculate fees
    stripe_fee_cents = int(amount_cents * 0.029 + 30)  # 2.9% + $0.30
    platform_fee_cents = int(amount_cents * 0.001 + 30)  # 0.1% + $0.30
    merchant_receives_cents = amount_cents - stripe_fee_cents - platform_fee_cents
    
    print(f"Amount: ${amount_cents/100:.2f} {currency.upper()}")
    print(f"Stripe fee: ${stripe_fee_cents/100:.2f} (2.9% + $0.30)")
    print(f"Platform fee: ${platform_fee_cents/100:.2f} (0.1% + $0.30)")
    print(f"Merchant receives: ${merchant_receives_cents/100:.2f}")
    
    # Create a test payment intent
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            description="TEST: POS Sale - Test Customer",
            metadata={
                'source': 'pos',
                'user_id': str(user.id),
                'tenant_id': str(profile.tenant_id),
                'customer_name': 'Test Customer',
                'platform_fee': platform_fee_cents,
                'merchant_receives': merchant_receives_cents,
                'pos_transaction_id': 'TEST-123',
                'test_mode': 'true'
            },
            # Use test payment method for automatic confirmation
            payment_method_types=['card'],
            confirm=True,  # Auto-confirm for testing
            payment_method='pm_card_visa',  # Test card that always succeeds
        )
        
        print(f"✓ Created payment intent: {payment_intent.id}")
        print(f"  Status: {payment_intent.status}")
        
    except stripe.error.StripeError as e:
        print(f"✗ Failed to create payment intent: {str(e)}")
        return
    
    # Step 4: Simulate webhook processing
    print("\n--- Simulating Webhook Processing ---")
    
    # Create the webhook payload
    webhook_payload = {
        'id': payment_intent.id,
        'amount': payment_intent.amount,
        'currency': payment_intent.currency,
        'metadata': payment_intent.metadata,
        'receipt_email': user.email,
        'status': 'succeeded'
    }
    
    # Process the webhook
    handle_payment_intent_for_settlement(webhook_payload)
    
    # Step 5: Check if settlement was created
    print("\n--- Checking Settlement Record ---")
    
    try:
        settlement = PaymentSettlement.objects.get(
            stripe_payment_intent_id=payment_intent.id
        )
        print(f"✓ Settlement created: {settlement.id}")
        print(f"  Status: {settlement.status}")
        print(f"  Original amount: ${settlement.original_amount}")
        print(f"  Settlement amount: ${settlement.settlement_amount}")
        print(f"  Platform fee: ${settlement.platform_fee}")
        print(f"  Stripe fee: ${settlement.stripe_fee}")
        
    except PaymentSettlement.DoesNotExist:
        print(f"✗ Settlement not found for payment intent: {payment_intent.id}")
        return
    
    # Step 6: Process the settlement (if Wise account exists)
    if wise_item and wise_item.is_verified:
        print("\n--- Processing Settlement via Wise ---")
        
        service = WiseSettlementService()
        
        # In staging, this will create a test quote
        if settings.ENVIRONMENT == 'staging':
            print("  (Running in staging - will create test quote only)")
        
        success = service.process_settlement(settlement)
        
        if success:
            print(f"✓ Settlement processed successfully")
            print(f"  Status: {settlement.status}")
            if settlement.wise_transfer_id:
                print(f"  Wise transfer ID: {settlement.wise_transfer_id}")
        else:
            print(f"✗ Settlement processing failed")
            print(f"  Reason: {settlement.failure_reason}")
    else:
        print("\n⚠️  Cannot process settlement - Wise account not set up or not verified")
        print("  Settlement will be processed once user sets up Wise account")
    
    # Step 7: Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Payment Intent: {payment_intent.id}")
    print(f"Settlement: {settlement.id if 'settlement' in locals() else 'Not created'}")
    print(f"Amount to transfer: ${merchant_receives_cents/100:.2f}")
    
    if wise_item:
        print(f"Wise account: {wise_item.bank_name} ({wise_item.bank_country})")
        print(f"Status: {'Ready for transfer' if wise_item.is_verified else 'Needs verification'}")
    else:
        print("Wise account: Not configured")
    
    print("\n💡 Next steps:")
    if not wise_item:
        print("1. User needs to set up Wise bank account in Settings > Banking")
    elif not wise_item.is_verified:
        print("1. User needs to verify Wise bank account")
    else:
        print("1. Settlement will be processed in next batch (or run manually)")
        print("   python manage.py process_settlements --user-id " + str(user.id))
    
    print("2. Make a real POS credit card payment in the app")
    print("3. Check PaymentSettlement records in Django admin")
    print("4. Monitor Wise transfers in Wise dashboard")

if __name__ == "__main__":
    import sys
    
    email = sys.argv[1] if len(sys.argv) > 1 else "kuoldimdeng@outlook.com"
    test_pos_payment_flow(email)