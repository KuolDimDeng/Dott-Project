#!/usr/bin/env python
"""Test email configuration and send a test email"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_email_config():
    """Test email configuration"""
    
    print("🔧 Email Configuration Test")
    print("=" * 50)
    
    # Check settings
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"EMAIL_HOST_PASSWORD: {'*' * len(str(settings.EMAIL_HOST_PASSWORD))}")
    print(f"DEFAULT_FROM_EMAIL: {getattr(settings, 'DEFAULT_FROM_EMAIL', 'not set')}")
    print("=" * 50)
    
    # Get test email
    test_email = input("Enter your email address for test: ").strip()
    
    if not test_email or '@' not in test_email:
        print("❌ Invalid email address")
        return
    
    print(f"\n📧 Sending test email to: {test_email}")
    
    try:
        send_mail(
            subject='Dott Email Test - Configuration Working!',
            message='This is a test email from Dott. If you received this, email configuration is working correctly!',
            from_email='no-reply@dottapps.com',
            recipient_list=[test_email],
            fail_silently=False,
            html_message="""
            <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>🎉 Email Configuration Test Successful!</h2>
                <p>This is a test email from Dott.</p>
                <p>If you received this, your email configuration is working correctly!</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    Sent from: no-reply@dottapps.com<br>
                    Email backend: Django SMTP
                </p>
            </body>
            </html>
            """
        )
        print("✅ Email sent successfully!")
        print("📮 Check your inbox (and spam folder)")
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_email_config()