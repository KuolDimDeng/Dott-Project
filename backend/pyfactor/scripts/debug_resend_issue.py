#!/usr/bin/env python3
"""
Debug why resend email is not working
"""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

print("Debugging Resend Email Issue")
print("="*50)

# Check environment variable
import os
env_key = os.environ.get('RESEND_API_KEY')
if env_key:
    print(f"✅ RESEND_API_KEY in environment: {env_key[:20]}...")
else:
    print("❌ RESEND_API_KEY NOT in environment variables")

# Check Django settings
from django.conf import settings
settings_key = getattr(settings, 'RESEND_API_KEY', None)
if settings_key:
    print(f"✅ RESEND_API_KEY in Django settings: {settings_key[:20]}...")
else:
    print("❌ RESEND_API_KEY NOT in Django settings")
    print("   Check if it's being loaded from environment")

# Check if resend package can be imported
try:
    import resend
    print(f"✅ Resend package installed: version {resend.__version__ if hasattr(resend, '__version__') else 'unknown'}")
except ImportError as e:
    print(f"❌ Resend package NOT installed: {e}")

# Check receipt_views module
try:
    from sales.receipt_views import RESEND_AVAILABLE, resend_client
    print(f"\n✅ receipt_views imported")
    print(f"   RESEND_AVAILABLE: {RESEND_AVAILABLE}")
    print(f"   resend_client: {'Initialized' if resend_client else 'None'}")
except ImportError as e:
    print(f"❌ Error importing receipt_views: {e}")

# Try to manually initialize resend
if settings_key:
    try:
        from resend import Resend
        test_client = Resend(api_key=settings_key)
        print("\n✅ Successfully created test Resend client")
    except Exception as e:
        print(f"\n❌ Failed to create Resend client: {e}")

print("\nPossible Issues:")
print("-"*50)
if not env_key and not settings_key:
    print("1. RESEND_API_KEY not configured at all")
if settings_key and not 'resend' in sys.modules:
    print("2. Resend package not installed (pip install resend==2.5.1)")
if settings_key and 'resend' in sys.modules and not resend_client:
    print("3. Resend client failed to initialize in receipt_views.py")