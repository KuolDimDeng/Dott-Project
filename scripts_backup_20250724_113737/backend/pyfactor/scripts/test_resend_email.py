#!/usr/bin/env python
"""
Test script for Resend email configuration
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def test_resend_email():
    """Test sending email with Resend"""
    print("Testing Resend email configuration...")
    print(f"Email Backend: {settings.EMAIL_BACKEND}")
    print(f"Default From Email: {settings.DEFAULT_FROM_EMAIL}")
    print(f"Resend API Key: {'*' * 10 if settings.RESEND_API_KEY else 'NOT SET'}")
    
    if not settings.RESEND_API_KEY:
        print("\n⚠️  WARNING: RESEND_API_KEY is not set!")
        print("Emails will be printed to console instead of being sent.")
    
    try:
        # Send test email
        result = send_mail(
            subject='Test Email from Dott',
            message='This is a test email to verify Resend configuration.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['test@example.com'],  # Replace with your email
            fail_silently=False,
            html_message="""
            <h2>Test Email from Dott</h2>
            <p>This is a test email to verify that your Resend email configuration is working correctly.</p>
            <p>If you receive this email, your setup is complete!</p>
            """
        )
        
        if result:
            print("\n✅ Email sent successfully!")
        else:
            print("\n❌ Email failed to send.")
            
    except Exception as e:
        print(f"\n❌ Error sending email: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure RESEND_API_KEY is set in your environment")
        print("2. Verify your API key is correct")
        print("3. Check that your Resend account is active")

if __name__ == '__main__':
    test_resend_email()