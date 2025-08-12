#!/usr/bin/env python
"""
Test script for POS webhook handler
Usage: python scripts/test_pos_webhook.py --local
"""

import os
import sys
import django
import json
import stripe
from decimal import Decimal

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
from custom_auth.models import User
from banking.models import PaymentSettlement, WiseItem
from payments.webhook_handlers import handle_payment_intent_for_settlement

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

def test_webhook_handler():
    """Test the webhook handler with a simulated payment intent"""
    
    # Get a test user
    try:
        user = User.objects.filter(email='test@example.com').first()
        if not user:
            print("❌ No test user found. Please create a user with email: test@example.com")
            return False
    except Exception as e:
        print(f"❌ Error getting user: {e}")
        return False
    
    print(f"✅ Found user: {user.email}")
    
    # Check if user has Wise account
    wise_item = WiseItem.objects.filter(user=user).first()
    if wise_item:
        print(f"✅ User has Wise account: {wise_item.bank_name}")
    else:
        print("⚠️  User doesn't have Wise account set up (settlement will be created anyway)")
    
    # Create a test payment intent object (simulating Stripe's format)
    test_payment_intent = {
        'id': f'pi_test_{int(os.urandom(8).hex(), 16)}',
        'amount': 10000,  # $100.00 in cents
        'currency': 'usd',
        'metadata': {
            'user_id': str(user.id),
            'pos_transaction_id': f'pos_test_{int(os.urandom(4).hex(), 16)}',
            'source': 'pos'
        },
        'receipt_email': user.email
    }
    
    print(f"\n📝 Test Payment Intent:")
    print(f"   ID: {test_payment_intent['id']}")
    print(f"   Amount: ${test_payment_intent['amount']/100:.2f}")
    print(f"   User ID: {test_payment_intent['metadata']['user_id']}")
    
    # Check if settlement already exists
    existing = PaymentSettlement.objects.filter(
        stripe_payment_intent_id=test_payment_intent['id']
    ).first()
    
    if existing:
        print(f"⚠️  Settlement already exists: {existing.id}")
        return False
    
    # Process the payment intent
    print("\n🔄 Processing payment intent...")
    try:
        handle_payment_intent_for_settlement(test_payment_intent)
        
        # Check if settlement was created
        settlement = PaymentSettlement.objects.filter(
            stripe_payment_intent_id=test_payment_intent['id']
        ).first()
        
        if settlement:
            print(f"✅ Settlement created successfully!")
            print(f"\n💰 Settlement Details:")
            print(f"   ID: {settlement.id}")
            print(f"   Original Amount: ${settlement.original_amount}")
            print(f"   Stripe Fee: ${settlement.stripe_fee}")
            print(f"   Platform Fee: ${settlement.platform_fee}")
            print(f"   Settlement Amount: ${settlement.settlement_amount}")
            print(f"   Status: {settlement.status}")
            
            # Calculate what user receives
            wise_fee = Decimal('1.20')  # Estimated Wise fee
            user_receives = settlement.settlement_amount - wise_fee
            print(f"   Estimated User Receives: ${user_receives:.2f} (after ~${wise_fee} Wise fee)")
            
            return True
        else:
            print("❌ Settlement was not created")
            return False
            
    except Exception as e:
        print(f"❌ Error processing payment intent: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_test_data():
    """Clean up test settlements"""
    test_settlements = PaymentSettlement.objects.filter(
        stripe_payment_intent_id__startswith='pi_test_'
    )
    count = test_settlements.count()
    if count > 0:
        test_settlements.delete()
        print(f"\n🧹 Cleaned up {count} test settlement(s)")

if __name__ == '__main__':
    print("=" * 60)
    print("POS WEBHOOK HANDLER TEST")
    print("=" * 60)
    
    # Check for --local flag
    if '--local' in sys.argv:
        print("Running in LOCAL mode\n")
    else:
        print("⚠️  Add --local flag to run this test")
        sys.exit(1)
    
    # Run the test
    success = test_webhook_handler()
    
    if success:
        print("\n✅ TEST PASSED - Webhook handler is working!")
        
        # Ask if user wants to clean up
        response = input("\nClean up test data? (y/n): ")
        if response.lower() == 'y':
            cleanup_test_data()
    else:
        print("\n❌ TEST FAILED - Check the errors above")
    
    print("=" * 60)