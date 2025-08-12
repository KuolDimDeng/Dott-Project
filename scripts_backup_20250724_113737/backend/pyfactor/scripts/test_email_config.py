#!/usr/bin/env python
"""
Test Email Configuration Script
This script checks if email settings are properly configured in Django.
"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
from django.core.mail import send_mail, get_connection
from django.core.mail.backends.smtp import EmailBackend

def test_email_configuration():
    """Test if email is properly configured."""
    print("Email Configuration Test")
    print("=" * 50)
    
    # Check email settings
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_HOST_USER: {'[SET]' if settings.EMAIL_HOST_USER else '[NOT SET]'}")
    print(f"EMAIL_HOST_PASSWORD: {'[SET]' if settings.EMAIL_HOST_PASSWORD else '[NOT SET]'}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL or '[NOT SET]'}")
    
    print("\n" + "=" * 50)
    
    # Check if required environment variables are set
    missing_vars = []
    if not settings.EMAIL_HOST_USER:
        missing_vars.append('EMAIL_HOST_USER')
    if not settings.EMAIL_HOST_PASSWORD:
        missing_vars.append('EMAIL_HOST_PASSWORD')
    if not settings.DEFAULT_FROM_EMAIL:
        missing_vars.append('DEFAULT_FROM_EMAIL')
    
    if missing_vars:
        print("⚠️  MISSING ENVIRONMENT VARIABLES:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease set these in your .env file or environment.")
        print("\nFor Gmail, you need:")
        print("1. Enable 2-factor authentication")
        print("2. Generate an app-specific password at:")
        print("   https://myaccount.google.com/apppasswords")
        print("3. Use that password (not your regular Gmail password)")
        return False
    
    # Test SMTP connection
    print("\nTesting SMTP connection...")
    try:
        connection = get_connection()
        connection.open()
        print("✅ SMTP connection successful!")
        connection.close()
        return True
    except Exception as e:
        print(f"❌ SMTP connection failed: {str(e)}")
        print("\nPossible issues:")
        print("1. Incorrect email credentials")
        print("2. Gmail requires app-specific password (not regular password)")
        print("3. Network/firewall blocking SMTP port 587")
        print("4. Gmail account security settings blocking access")
        return False

def test_send_email():
    """Test sending an actual email."""
    if not test_email_configuration():
        return False
    
    print("\n" + "=" * 50)
    print("Testing email send...")
    
    try:
        send_mail(
            subject='Dott Email Configuration Test',
            message='This is a test email from your Dott backend. If you receive this, email is configured correctly!',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['test@example.com'],  # Change this to your email
            fail_silently=False,
        )
        print("✅ Test email sent successfully!")
        print("   (Check your email to confirm receipt)")
        return True
    except Exception as e:
        print(f"❌ Failed to send test email: {str(e)}")
        return False

if __name__ == '__main__':
    print("Django Email Configuration Test\n")
    
    # Run tests
    config_ok = test_email_configuration()
    
    if config_ok:
        print("\n" + "=" * 50)
        response = input("\nWould you like to send a test email? (y/n): ")
        if response.lower() == 'y':
            email = input("Enter your email address: ")
            if email and '@' in email:
                # Temporarily override recipient for testing
                import django.core.mail
                original_send_mail = django.core.mail.send_mail
                
                def test_send_mail_wrapper(*args, **kwargs):
                    kwargs['recipient_list'] = [email]
                    return original_send_mail(*args, **kwargs)
                
                django.core.mail.send_mail = test_send_mail_wrapper
                test_send_email()
                django.core.mail.send_mail = original_send_mail
            else:
                print("Invalid email address.")