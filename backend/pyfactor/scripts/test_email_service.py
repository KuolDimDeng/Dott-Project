#!/usr/bin/env python3
"""
Test email service configuration and functionality
"""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
import logging

logger = logging.getLogger(__name__)

print("Testing Email Service Configuration")
print("="*50)

# Check RESEND_API_KEY
resend_key = getattr(settings, 'RESEND_API_KEY', None)
if resend_key:
    print(f"✅ RESEND_API_KEY is configured: {resend_key[:20]}...")
else:
    print("❌ RESEND_API_KEY is NOT configured in Django settings")
    print("   Check if environment variable is set correctly")

# Try importing resend
try:
    from resend import Resend
    print("✅ Resend package is installed")
    
    if resend_key:
        # Test Resend client initialization
        resend_client = Resend(api_key=resend_key)
        print("✅ Resend client initialized successfully")
        
        # Try to send a test email (uncomment to actually send)
        # try:
        #     response = resend_client.emails.send({
        #         "from": "Dott POS <noreply@dottapps.com>",
        #         "to": ["test@example.com"],
        #         "subject": "Test Email from Dott POS",
        #         "html": "<p>This is a test email from the Dott POS system.</p>",
        #         "text": "This is a test email from the Dott POS system."
        #     })
        #     print(f"✅ Test email sent successfully: {response}")
        # except Exception as e:
        #     print(f"❌ Failed to send test email: {e}")
        
except ImportError as e:
    print(f"❌ Resend package is NOT installed: {e}")
    print("   Run: pip install resend==2.5.0")

# Test the receipt_views module
print("\nTesting receipt_views module...")
print("-"*50)

try:
    from sales import receipt_views
    print("✅ receipt_views module imported successfully")
    
    # Check if resend_client is initialized
    if hasattr(receipt_views, 'resend_client'):
        if receipt_views.resend_client:
            print("✅ resend_client is initialized in receipt_views")
        else:
            print("❌ resend_client is None in receipt_views")
    else:
        print("❌ resend_client not found in receipt_views")
    
    # Check RESEND_AVAILABLE flag
    if hasattr(receipt_views, 'RESEND_AVAILABLE'):
        if receipt_views.RESEND_AVAILABLE:
            print("✅ RESEND_AVAILABLE is True")
        else:
            print("❌ RESEND_AVAILABLE is False - resend package not imported")
    
except Exception as e:
    print(f"❌ Error importing receipt_views: {e}")

print("\nDiagnosis Summary:")
print("="*50)

issues = []
if not resend_key:
    issues.append("RESEND_API_KEY not configured in Django settings")
if 'resend_client' in locals() and not resend_client:
    issues.append("Resend client failed to initialize")
if 'Resend' not in dir():
    issues.append("Resend package not installed")

if issues:
    print("❌ Issues found:")
    for issue in issues:
        print(f"   - {issue}")
    print("\nTo fix:")
    print("1. Ensure RESEND_API_KEY is in environment variables")
    print("2. Install resend: pip install resend==2.5.0")
    print("3. Restart Django application")
else:
    print("✅ Email service is properly configured and ready to use!")