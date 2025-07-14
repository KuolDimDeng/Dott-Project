#!/usr/bin/env python
"""
Test Resend email configuration
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
from django.core.mail import send_mail

def test_resend():
    """Test Resend email sending"""
    print("🚀 Resend Email Test")
    print("=" * 50)
    
    # Check if Resend is configured
    if hasattr(settings, 'RESEND_API_KEY'):
        print(f"✅ RESEND_API_KEY is set")
    else:
        print(f"❌ RESEND_API_KEY not found in settings")
    
    api_key = os.environ.get('RESEND_API_KEY')
    if api_key:
        print(f"✅ RESEND_API_KEY found in environment")
        print(f"   Key starts with: {api_key[:10]}...")
    else:
        print("❌ RESEND_API_KEY not set in environment")
        return
    
    print(f"\nEmail Backend: {settings.EMAIL_BACKEND}")
    print(f"Default From Email: {settings.DEFAULT_FROM_EMAIL}")
    
    # Get test email
    test_email = input("\nEnter email address to test: ").strip()
    
    if not test_email or '@' not in test_email:
        print("❌ Invalid email address")
        return
    
    print(f"\n📧 Sending test email to: {test_email}")
    
    try:
        result = send_mail(
            subject='Dott - Resend Test Email',
            message='This is a test email from Dott using Resend.',
            from_email='no-reply@dottapps.com',
            recipient_list=[test_email],
            fail_silently=False,
            html_message="""
            <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>🎉 Resend Email Test Successful!</h2>
                <p>This email was sent using Resend API.</p>
                <p>Your Dott email invitations are now working!</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    Sent via Resend Email Service<br>
                    From: no-reply@dottapps.com
                </p>
            </body>
            </html>
            """
        )
        print(f"✅ Email sent successfully! Result: {result}")
        print("📮 Check your inbox!")
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_resend()