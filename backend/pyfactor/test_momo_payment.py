#!/usr/bin/env python
"""
Test MTN MoMo Payment Integration
Run this script to test the mobile money payment functionality
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

import json
import uuid
from decimal import Decimal
from django.conf import settings

print("🚀 Testing MTN MoMo Payment Integration")
print("=" * 50)

# Check environment variables
print("\n📋 Environment Variables:")
print(f"  PAYMENT_TEST_MODE: {getattr(settings, 'PAYMENT_TEST_MODE', 'Not set')}")
print(f"  FIELD_ENCRYPTION_KEY: {'Set' if getattr(settings, 'FIELD_ENCRYPTION_KEY', None) else 'Not set'}")
print(f"  MOMO_SANDBOX_SUBSCRIPTION_KEY: {'Set' if getattr(settings, 'MOMO_SANDBOX_SUBSCRIPTION_KEY', None) else 'Not set'}")

# Import the service
try:
    from payments.services.mtn_momo_service import MTNMoMoService
    from payments.models_mobile_money import MobileMoneyProvider, MobileMoneyTransaction
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    print("\n✅ Modules imported successfully")
    
    # Initialize the service
    service = MTNMoMoService()
    print("✅ MTN MoMo service initialized")
    
    # Test authentication
    print("\n🔐 Testing Authentication...")
    auth_result = service.authenticate()
    if auth_result.get('success'):
        print(f"✅ Authentication successful!")
        print(f"   Token: {auth_result.get('access_token', '')[:30]}...")
    else:
        print(f"❌ Authentication failed: {auth_result.get('error', 'Unknown error')}")
    
    # Test payment request
    print("\n💳 Testing Payment Request...")
    reference_id = str(uuid.uuid4())
    
    test_payment_data = {
        'amount': Decimal('10.00'),
        'phone_number': '46733123450',  # MTN sandbox success number
        'reference': reference_id,
        'currency': 'EUR',
        'message': 'Test payment from backend'
    }
    
    print(f"   Reference ID: {reference_id}")
    print(f"   Phone: {test_payment_data['phone_number']}")
    print(f"   Amount: {test_payment_data['currency']} {test_payment_data['amount']}")
    
    payment_result = service.request_payment(**test_payment_data)
    
    if payment_result.get('success'):
        print("✅ Payment request successful!")
        print(f"   Status: {payment_result.get('status', 'PENDING')}")
        print(f"   Message: {payment_result.get('message', '')}")
        
        # Check payment status
        print("\n🔍 Checking Payment Status...")
        status_result = service.check_payment_status(reference_id)
        print(f"   Status: {status_result.get('status', 'Unknown')}")
        if status_result.get('success'):
            print("✅ Status check successful!")
        else:
            print(f"⚠️  Status check issue: {status_result.get('error', 'Unknown')}")
    else:
        print(f"❌ Payment request failed: {payment_result.get('error', 'Unknown error')}")
    
    # Test webhook verification
    print("\n🔔 Testing Webhook Verification...")
    test_headers = {'X-Callback-Signature': 'test-signature'}
    test_payload = json.dumps({'reference': reference_id, 'status': 'SUCCESSFUL'})
    is_valid = service.verify_webhook(test_headers, test_payload, 'test-signature')
    print(f"   Webhook verification: {'✅ Valid' if is_valid else '⚠️  Not validated (expected in sandbox)'}")
    
    print("\n✨ Test Complete!")
    
except ImportError as e:
    print(f"\n❌ Import error: {e}")
    print("   Make sure all dependencies are installed")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()