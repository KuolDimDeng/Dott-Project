#!/usr/bin/env python
"""
Test script for POS settlement webhook
Simulates a Stripe webhook event for testing
"""

import json
import hmac
import hashlib
import time
import requests
from decimal import Decimal

# Configuration
WEBHOOK_URL = "https://api.dottapps.com/api/payments/webhooks/stripe/pos-settlements/"
WEBHOOK_SECRET = "whsec_..."  # Replace with your actual webhook secret

def generate_stripe_signature(payload, secret):
    """Generate a valid Stripe webhook signature"""
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"
    signature = hmac.new(
        secret.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return f"t={timestamp},v1={signature}"

def create_test_payment_intent_event(user_id, amount=10000):
    """Create a test payment_intent.succeeded event"""
    return {
        "id": f"evt_test_{int(time.time())}",
        "object": "event",
        "created": int(time.time()),
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": f"pi_test_{int(time.time())}",
                "object": "payment_intent",
                "amount": amount,  # in cents
                "currency": "usd",
                "status": "succeeded",
                "metadata": {
                    "source": "pos",
                    "user_id": user_id,
                    "pos_transaction_id": f"POS-TEST-{int(time.time())}",
                    "store_id": "store_test_123"
                },
                "receipt_email": "customer@example.com",
                "created": int(time.time()),
                "charges": {
                    "object": "list",
                    "data": [{
                        "id": f"ch_test_{int(time.time())}",
                        "amount": amount,
                        "currency": "usd"
                    }]
                }
            }
        }
    }

def send_test_webhook(event_data, webhook_secret=None):
    """Send test webhook to the endpoint"""
    payload = json.dumps(event_data)
    
    headers = {
        "Content-Type": "application/json",
    }
    
    if webhook_secret:
        signature = generate_stripe_signature(payload, webhook_secret)
        headers["Stripe-Signature"] = signature
    
    try:
        response = requests.post(
            WEBHOOK_URL,
            data=payload,
            headers=headers,
            timeout=30
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text[:500] if response.text else 'Empty'}")
        
        if response.status_code == 200:
            print("✅ Webhook processed successfully!")
        elif response.status_code == 400:
            print("❌ Bad request - check webhook signature or payload")
        else:
            print(f"⚠️ Unexpected status code: {response.status_code}")
            
        return response
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error sending webhook: {e}")
        return None

def test_local_webhook():
    """Test webhook locally (without signature verification)"""
    print("\n=== Testing Local Webhook (No Signature) ===")
    
    # Use a test user ID - replace with actual user ID from your database
    test_user_id = "1"  # Replace with actual user ID
    
    event = create_test_payment_intent_event(
        user_id=test_user_id,
        amount=10000  # $100.00
    )
    
    print(f"Sending test payment for user {test_user_id}, amount: $100.00")
    send_test_webhook(event)

def test_production_webhook():
    """Test production webhook with signature"""
    print("\n=== Testing Production Webhook (With Signature) ===")
    
    if WEBHOOK_SECRET == "whsec_...":
        print("⚠️ Please update WEBHOOK_SECRET with your actual secret from Stripe Dashboard")
        return
    
    # Use actual user ID from your production database
    test_user_id = "1"  # Replace with actual user ID
    
    event = create_test_payment_intent_event(
        user_id=test_user_id,
        amount=15000  # $150.00
    )
    
    print(f"Sending test payment for user {test_user_id}, amount: $150.00")
    send_test_webhook(event, WEBHOOK_SECRET)

def check_settlement_created(user_id):
    """Check if settlement was created (requires Django environment)"""
    try:
        import django
        import os
        import sys
        
        # Add parent directory to path
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
        django.setup()
        
        from banking.models import PaymentSettlement
        
        recent_settlements = PaymentSettlement.objects.filter(
            user_id=user_id
        ).order_by('-created_at')[:5]
        
        if recent_settlements:
            print(f"\n📊 Recent settlements for user {user_id}:")
            for settlement in recent_settlements:
                print(f"  - ID: {settlement.id}")
                print(f"    Amount: ${settlement.original_amount}")
                print(f"    Status: {settlement.status}")
                print(f"    Created: {settlement.created_at}")
                print(f"    POS Transaction: {settlement.pos_transaction_id}")
        else:
            print(f"\n⚠️ No settlements found for user {user_id}")
            
    except Exception as e:
        print(f"\n⚠️ Could not check settlements (run this in Django environment): {e}")

if __name__ == "__main__":
    import sys
    
    print("🧪 POS Settlement Webhook Test Script")
    print("=" * 50)
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--local":
            test_local_webhook()
        elif sys.argv[1] == "--production":
            test_production_webhook()
        elif sys.argv[1] == "--check":
            if len(sys.argv) > 2:
                check_settlement_created(sys.argv[2])
            else:
                print("Usage: python test_pos_webhook.py --check <user_id>")
        else:
            print("Usage:")
            print("  python test_pos_webhook.py --local      # Test without signature")
            print("  python test_pos_webhook.py --production # Test with signature")
            print("  python test_pos_webhook.py --check <user_id> # Check settlements")
    else:
        # Default: test without signature
        test_local_webhook()
        
        print("\n💡 To test with production signature:")
        print("   1. Get webhook secret from Stripe Dashboard")
        print("   2. Update WEBHOOK_SECRET in this script")
        print("   3. Run: python test_pos_webhook.py --production")
        
        print("\n💡 To check if settlement was created:")
        print("   Run: python test_pos_webhook.py --check <user_id>")