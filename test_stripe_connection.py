#!/usr/bin/env python3
"""
Test Stripe connection and configuration
"""
import os
import sys
import django

# Add project to path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

import stripe
from django.conf import settings

print("=" * 60)
print("STRIPE CONNECTION TEST")
print("=" * 60)

# Check configuration
stripe_key = settings.STRIPE_SECRET_KEY
if stripe_key:
    key_type = "TEST" if "test" in stripe_key else "LIVE"
    key_prefix = stripe_key[:7]
    print(f"✓ Stripe key configured: {key_prefix}... ({key_type} mode)")
else:
    print("✗ No Stripe key found!")
    sys.exit(1)

# Configure Stripe
stripe.api_key = stripe_key

# Test connection
try:
    print("\nTesting Stripe connection...")
    
    # Try to list payment methods (this should work with any valid key)
    balance = stripe.Balance.retrieve()
    print(f"✓ Connection successful!")
    print(f"  Available balance: {balance.available}")
    print(f"  Pending balance: {balance.pending}")
    
    # Try to create a test payment intent
    print("\nTesting payment intent creation...")
    intent = stripe.PaymentIntent.create(
        amount=100,  # $1.00 in cents
        currency='usd',
        metadata={'test': 'true', 'source': 'connection_test'}
    )
    print(f"✓ Payment intent created: {intent.id}")
    print(f"  Amount: ${intent.amount/100:.2f} {intent.currency.upper()}")
    print(f"  Status: {intent.status}")
    
    # Cancel the test intent
    stripe.PaymentIntent.cancel(intent.id)
    print(f"✓ Test intent cancelled")
    
except stripe.error.AuthenticationError as e:
    print(f"✗ Authentication failed: {e}")
    print("  Check that your Stripe key is valid")
except stripe.error.StripeError as e:
    print(f"✗ Stripe error: {e}")
except Exception as e:
    print(f"✗ Unexpected error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)