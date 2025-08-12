#!/usr/bin/env python
"""
Test email sending with detailed debugging
"""

import os
import sys
import django
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
from django.core.mail import send_mail, EmailMessage

def test_smtp_direct():
    """Test SMTP connection directly"""
    print("\n🔧 Direct SMTP Test")
    print("=" * 60)
    
    host = settings.EMAIL_HOST
    port = settings.EMAIL_PORT
    username = settings.EMAIL_HOST_USER
    password = settings.EMAIL_HOST_PASSWORD
    
    print(f"Connecting to {host}:{port}")
    print(f"Username: {username}")
    
    try:
        # Create SMTP connection
        if settings.EMAIL_USE_TLS:
            server = smtplib.SMTP(host, port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(host, port)
        
        print("✅ Connected to SMTP server")
        
        # Login
        server.login(username, password)
        print("✅ Login successful")
        
        # Close connection
        server.quit()
        print("✅ SMTP test completed successfully")
        
    except Exception as e:
        print(f"❌ SMTP test failed: {e}")
        import traceback
        traceback.print_exc()

def test_django_email():
    """Test Django email sending"""
    print("\n📧 Django Email Test")
    print("=" * 60)
    
    test_email = input("Enter recipient email address: ").strip()
    
    if not test_email or '@' not in test_email:
        print("❌ Invalid email address")
        return
    
    print(f"\nSending test email to: {test_email}")
    print("From: no-reply@dottapps.com")
    
    try:
        # Method 1: Using send_mail
        print("\n1️⃣ Testing with send_mail...")
        result = send_mail(
            subject='Dott Test Email - Method 1',
            message='This is a test email from Dott using send_mail.',
            from_email='no-reply@dottapps.com',
            recipient_list=[test_email],
            fail_silently=False,
        )
        print(f"✅ send_mail result: {result}")
        
        # Method 2: Using EmailMessage
        print("\n2️⃣ Testing with EmailMessage...")
        email = EmailMessage(
            subject='Dott Test Email - Method 2',
            body='This is a test email from Dott using EmailMessage.',
            from_email='no-reply@dottapps.com',
            to=[test_email],
        )
        result = email.send()
        print(f"✅ EmailMessage result: {result}")
        
        print("\n✅ Both email methods completed successfully!")
        print("📮 Check your inbox (and spam folder)")
        
    except Exception as e:
        print(f"\n❌ Email sending failed: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("🚀 Dott Email Testing Tool")
    print("=" * 60)
    
    # Show current configuration
    print("Current Email Configuration:")
    print(f"  EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"  EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"  EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"  EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"  EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    
    # Test SMTP directly
    test_smtp_direct()
    
    # Test Django email
    test_django_email()

if __name__ == "__main__":
    main()