#!/usr/bin/env python
"""
Test email configuration for Dott
Run this from Django shell: python manage.py shell < test_email.py
"""

import os
from django.core.mail import send_mail
from django.conf import settings

print("Testing email configuration...")
print(f"Email Host: {settings.EMAIL_HOST}")
print(f"Email Port: {settings.EMAIL_PORT}")
print(f"Email User: {settings.EMAIL_HOST_USER}")
print(f"From Email: {settings.DEFAULT_FROM_EMAIL}")

try:
    # Send test email
    result = send_mail(
        subject='Dott Email Test',
        message='This is a test email from your Dott application.',
        from_email=settings.DEFAULT_FROM_EMAIL or 'no-reply@dottapps.com',
        recipient_list=['your-email@example.com'],  # Replace with your email
        fail_silently=False,
    )
    
    if result:
        print("\n✅ Success! Email sent successfully.")
        print("Check your inbox for the test email.")
    else:
        print("\n❌ Email sending failed with no error.")
        
except Exception as e:
    print(f"\n❌ Error sending email: {str(e)}")
    print("\nPossible solutions:")
    print("1. Check if SMTP AUTH is enabled for no-reply@dottapps.com")
    print("2. Verify the password is correct")
    print("3. Check if your IP is allowed to send emails")
    print("4. You may need to use an app password instead")