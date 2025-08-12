#!/usr/bin/env python
"""
Check recent email logs and configuration
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

def check_email_config():
    """Check and display email configuration"""
    print("🔧 Email Configuration Check")
    print("=" * 60)
    
    # Check email settings
    print("📧 Django Email Settings:")
    print(f"  EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"  EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"  EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"  EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"  EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"  EMAIL_HOST_PASSWORD: {'*' * len(str(settings.EMAIL_HOST_PASSWORD)) if settings.EMAIL_HOST_PASSWORD else 'NOT SET'}")
    print(f"  DEFAULT_FROM_EMAIL: {getattr(settings, 'DEFAULT_FROM_EMAIL', 'not set')}")
    
    print("\n🔍 Environment Variables:")
    print(f"  EMAIL_HOST: {os.environ.get('EMAIL_HOST', 'NOT SET')}")
    print(f"  EMAIL_PORT: {os.environ.get('EMAIL_PORT', 'NOT SET')}")
    print(f"  EMAIL_HOST_USER: {os.environ.get('EMAIL_HOST_USER', 'NOT SET')}")
    print(f"  EMAIL_HOST_PASSWORD: {'SET' if os.environ.get('EMAIL_HOST_PASSWORD') else 'NOT SET'}")
    
    # Test SMTP connection
    print("\n🌐 Testing SMTP Connection...")
    try:
        from django.core.mail import get_connection
        connection = get_connection()
        connection.open()
        print("✅ SMTP connection successful!")
        connection.close()
    except Exception as e:
        print(f"❌ SMTP connection failed: {e}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    check_email_config()