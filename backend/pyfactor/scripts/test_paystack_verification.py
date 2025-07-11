#!/usr/bin/env python
"""
Test script for Paystack payment verification endpoint

Usage:
    python scripts/test_paystack_verification.py

This script tests the /api/payments/verify-paystack/ endpoint
"""
import os
import sys
import django
import requests
from django.contrib.auth import get_user_model

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def test_paystack_verification():
    """Test the Paystack verification endpoint"""
    
    # Get a test user
    User = get_user_model()
    test_user = User.objects.filter(is_active=True).first()
    
    if not test_user:
        print("No active users found for testing")
        return
    
    print(f"Testing with user: {test_user.email}")
    
    # Test data
    test_data = {
        "reference": "test_reference_123"
    }
    
    # Note: In a real test, you would need to:
    # 1. Authenticate as the test user
    # 2. Use a valid payment reference from Paystack
    # 3. Make an actual API call to the endpoint
    
    print("\nTo test the endpoint, make a POST request to:")
    print("  /api/payments/verify-paystack/")
    print("\nWith data:")
    print(f"  {test_data}")
    print("\nRequired headers:")
    print("  Authorization: Bearer <user_token>")
    print("  Content-Type: application/json")
    
    print("\nThe endpoint will:")
    print("  1. Verify the payment reference with Paystack API")
    print("  2. Check if PAYSTACK_SECRET_KEY is configured")
    print("  3. Validate user authorization")
    print("  4. Update subscription if payment is for subscription")
    print("  5. Record payment transaction in database")
    print("  6. Return verification result")
    
    print("\nRequired environment variable:")
    print("  PAYSTACK_SECRET_KEY=sk_...")
    
    # Check if Paystack is configured
    if os.getenv('PAYSTACK_SECRET_KEY'):
        print("\n✓ PAYSTACK_SECRET_KEY is configured")
    else:
        print("\n✗ PAYSTACK_SECRET_KEY is NOT configured")
        print("  Set it in your environment or .env file")

if __name__ == "__main__":
    test_paystack_verification()