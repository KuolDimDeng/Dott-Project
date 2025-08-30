#!/usr/bin/env python
"""
Test Paystack M-Pesa Integration
Run this script to test M-Pesa payments via Paystack
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

print("🚀 Testing Paystack M-Pesa Integration")
print("=" * 50)

# Check environment variables
print("\n📋 Environment Variables:")
print(f"  PAYSTACK_SECRET_KEY: {'Set' if getattr(settings, 'PAYSTACK_SECRET_KEY', None) else 'Not set'}")

# Import the service
try:
    from payments.services.paystack_service import PaystackService
    from payments.models_mobile_money import MobileMoneyProvider, MobileMoneyTransaction
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    print("\n✅ Modules imported successfully")
    
    # Initialize the service
    service = PaystackService()
    print("✅ Paystack service initialized")
    
    # Test authentication
    print("\n🔐 Testing Authentication...")
    auth_result = service.authenticate()
    if auth_result.get('success'):
        print(f"✅ Authentication successful!")
    else:
        print(f"❌ Authentication failed: {auth_result.get('error', 'Unknown error')}")
    
    # Test payment request for Kenya M-Pesa
    print("\n💳 Testing M-Pesa Payment Request (Kenya)...")
    reference_id = str(uuid.uuid4())
    
    test_payment_data = {
        'amount': Decimal('100.00'),  # 100 KES
        'phone_number': '254712345678',  # Kenyan test number
        'reference': reference_id,
        'currency': 'KES',
        'message': 'Test M-Pesa payment via Paystack',
        'email': 'test@example.com',
        'provider': 'mpesa'
    }
    
    print(f"   Reference ID: {reference_id}")
    print(f"   Phone: {test_payment_data['phone_number']}")
    print(f"   Amount: {test_payment_data['currency']} {test_payment_data['amount']}")
    
    payment_result = service.request_payment(**test_payment_data)
    
    if payment_result.get('success'):
        print("✅ Payment request successful!")
        print(f"   Status: {payment_result.get('status', 'PENDING')}")
        print(f"   Reference: {payment_result.get('reference', '')}")
        print(f"   Message: {payment_result.get('message', '')}")
        
        if payment_result.get('authorization_url'):
            print(f"   Authorization URL: {payment_result.get('authorization_url')}")
        
        # Check payment status
        print("\n🔍 Checking Payment Status...")
        paystack_reference = payment_result.get('reference', reference_id)
        status_result = service.check_payment_status(paystack_reference)
        print(f"   Status: {status_result.get('status', 'Unknown')}")
        print(f"   Gateway Response: {status_result.get('gateway_response', '')}")
        
        if status_result.get('success'):
            print("✅ Status check successful!")
        else:
            print(f"⚠️  Status check issue: {status_result.get('error', 'Unknown')}")
    else:
        print(f"❌ Payment request failed: {payment_result.get('error', 'Unknown error')}")
    
    # Test Ghana mobile money
    print("\n💳 Testing Mobile Money Payment (Ghana)...")
    ghana_reference = str(uuid.uuid4())
    
    ghana_payment = {
        'amount': Decimal('50.00'),  # 50 GHS
        'phone_number': '233241234567',  # Ghana test number
        'reference': ghana_reference,
        'currency': 'GHS',
        'message': 'Test Ghana mobile money',
        'email': 'ghana@test.com',
        'provider': 'mtn'  # MTN Mobile Money Ghana
    }
    
    print(f"   Phone: {ghana_payment['phone_number']}")
    print(f"   Amount: {ghana_payment['currency']} {ghana_payment['amount']}")
    
    ghana_result = service.request_payment(**ghana_payment)
    
    if ghana_result.get('success'):
        print("✅ Ghana payment request successful!")
        print(f"   Reference: {ghana_result.get('reference', '')}")
    else:
        print(f"⚠️  Ghana payment failed: {ghana_result.get('error', 'Unknown')}")
    
    # Test phone validation
    print("\n📱 Testing Phone Number Validation...")
    test_numbers = [
        ('254712345678', 'KE'),  # Kenya
        ('233241234567', 'GH'),  # Ghana
        ('2348012345678', 'NG'), # Nigeria
        ('27812345678', 'ZA'),   # South Africa
    ]
    
    for phone, country in test_numbers:
        validation = service.validate_phone_for_country(phone, country)
        if validation.get('success'):
            print(f"   ✅ {country}: {phone} → {validation.get('formatted_number')}")
        else:
            print(f"   ❌ {country}: {phone} → {validation.get('error')}")
    
    # Show supported countries
    print("\n🌍 Supported Countries:")
    for country in service.get_supported_countries():
        print(f"   {country['name']} ({country['code']}): {country['currency']} via {country['provider']}")
    
    print("\n✨ Test Complete!")
    print("\n📝 Next Steps:")
    print("1. Check Paystack dashboard for test transactions")
    print("2. Test with real phone numbers in test mode")
    print("3. Implement webhook handling for payment confirmations")
    
except ImportError as e:
    print(f"\n❌ Import error: {e}")
    print("   Make sure all dependencies are installed")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()