#!/usr/bin/env python
"""
Check Stripe Configuration
Verifies that Stripe API keys are properly configured
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
import stripe

def check_stripe_config():
    """Check and display Stripe configuration status"""
    print("=" * 60)
    print("STRIPE CONFIGURATION CHECK")
    print("=" * 60)

    # Check environment variable
    env_key = os.environ.get('STRIPE_SECRET_KEY', '')
    print(f"\n1. Environment Variable (STRIPE_SECRET_KEY):")
    if env_key:
        print(f"   ✓ Found: {env_key[:7]}...")
        print(f"   Length: {len(env_key)} characters")
        print(f"   Type: {'Test' if 'test' in env_key else 'Live'} key")
    else:
        print("   ✗ NOT FOUND in environment")

    # Check Django settings
    settings_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
    print(f"\n2. Django Settings (settings.STRIPE_SECRET_KEY):")
    if settings_key:
        print(f"   ✓ Found: {settings_key[:7]}...")
        print(f"   Length: {len(settings_key)} characters")
        if settings_key.startswith('placeholder'):
            print("   ⚠️  WARNING: Using placeholder key!")
    else:
        print("   ✗ NOT FOUND in settings")

    # Check Stripe library initialization
    print(f"\n3. Stripe Library (stripe.api_key):")
    if stripe.api_key:
        print(f"   ✓ Initialized: {stripe.api_key[:7]}...")
    else:
        print("   ✗ NOT INITIALIZED")

    # Test the API key
    print("\n4. API Key Validation:")
    if stripe.api_key and not stripe.api_key.startswith('placeholder'):
        try:
            # Try to retrieve account info
            account = stripe.Account.retrieve()
            print(f"   ✓ Valid API key")
            print(f"   Account ID: {account.id}")
            print(f"   Account Type: {account.type}")
            print(f"   Country: {account.country}")
        except stripe.error.AuthenticationError as e:
            print(f"   ✗ Invalid API key: {e}")
        except Exception as e:
            print(f"   ✗ Error testing API key: {e}")
    else:
        print("   ⚠️  Cannot test - no valid API key configured")

    # Check publishable key
    pub_key = getattr(settings, 'STRIPE_PUBLISHABLE_KEY', '')
    print(f"\n5. Publishable Key (STRIPE_PUBLISHABLE_KEY):")
    if pub_key:
        print(f"   ✓ Found: {pub_key[:7]}...")
        print(f"   Type: {'Test' if 'test' in pub_key else 'Live'} key")
    else:
        print("   ✗ NOT FOUND")

    # Check Express Account ID
    express_id = getattr(settings, 'STRIPE_EXPRESS_ACCOUNT_ID', '')
    print(f"\n6. Express Account ID:")
    if express_id:
        print(f"   ✓ Found: {express_id}")
    else:
        print("   ✗ NOT FOUND")

    print("\n" + "=" * 60)

    # Final recommendation
    if not (env_key or settings_key) or (settings_key and settings_key.startswith('placeholder')):
        print("\n⚠️  ACTION REQUIRED:")
        print("   1. Set STRIPE_SECRET_KEY environment variable in Render")
        print("   2. Use your actual Stripe secret key (starts with 'sk_')")
        print("   3. Restart the service after setting the variable")
        print("\n   Example: STRIPE_SECRET_KEY=sk_test_...")
    elif stripe.api_key:
        print("\n✅ Stripe is properly configured and ready to use!")

    print("=" * 60)

if __name__ == '__main__':
    check_stripe_config()