#!/usr/bin/env python
"""
Test script to verify contact form email functionality with Resend
"""
import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
from django.core.mail import EmailMessage
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_resend_email():
    """Test if Resend email backend is working"""
    print("\n" + "="*60)
    print("CONTACT FORM EMAIL TEST - RESEND CONFIGURATION")
    print("="*60)
    
    # Check configuration
    print("\n1. Checking email configuration...")
    print(f"   EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"   DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    
    resend_key = os.environ.get('RESEND_API_KEY', '')
    if resend_key:
        print(f"   RESEND_API_KEY: {resend_key[:10]}... (configured)")
    else:
        print("   RESEND_API_KEY: NOT CONFIGURED!")
        return False
    
    # Test sending an email
    print("\n2. Testing email send...")
    try:
        test_email = EmailMessage(
            subject=f"[TEST] Contact Form Test - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            body="""
This is a test email from the Dott contact form system.

If you receive this email, it means:
✅ Resend API is properly configured
✅ Contact form emails will be delivered
✅ Auto-replies will work

Test Details:
- Sent via: Resend Email Service
- From: no-reply@dottapps.com
- Time: {}
            """.format(datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['support@dottapps.com']
        )
        
        result = test_email.send(fail_silently=False)
        
        if result:
            print("   ✅ Test email sent successfully!")
            print("   Check support@dottapps.com inbox for the test message")
            return True
        else:
            print("   ❌ Failed to send test email")
            return False
            
    except Exception as e:
        print(f"   ❌ Error sending test email: {str(e)}")
        return False

def test_contact_form_submission():
    """Simulate a contact form submission"""
    print("\n3. Simulating contact form submission...")
    
    try:
        from custom_auth.views.email_views import ContactFormView
        from django.test import RequestFactory
        import json
        
        # Create a mock request
        factory = RequestFactory()
        request = factory.post('/api/contact-form/', 
            data=json.dumps({
                'name': 'Test User',
                'email': 'test@example.com',
                'company': 'Test Company',
                'phone': '+1234567890',
                'subject': 'general',
                'message': 'This is a test message from the contact form test script.'
            }),
            content_type='application/json'
        )
        
        # Add required META fields
        request.META['HTTP_DATE'] = datetime.now().isoformat()
        request.META['HTTP_USER_AGENT'] = 'Test Script'
        request.META['HTTP_REFERER'] = 'https://dottapps.com/contact'
        request.META['REMOTE_ADDR'] = '127.0.0.1'
        
        # Process the view
        view = ContactFormView()
        response = view.post(request)
        
        if response.status_code == 200:
            print("   ✅ Contact form submission processed successfully!")
            print(f"   Response: {response.data}")
            return True
        else:
            print(f"   ❌ Contact form submission failed with status {response.status_code}")
            print(f"   Response: {response.data}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error processing contact form: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("\nStarting contact form email test...\n")
    
    # Test 1: Basic email configuration
    email_test = test_resend_email()
    
    # Test 2: Full contact form flow
    if email_test:
        form_test = test_contact_form_submission()
        
        print("\n" + "="*60)
        print("TEST RESULTS SUMMARY")
        print("="*60)
        print(f"Email Configuration: {'✅ PASS' if email_test else '❌ FAIL'}")
        print(f"Contact Form Flow:   {'✅ PASS' if form_test else '❌ FAIL'}")
        
        if email_test and form_test:
            print("\n🎉 All tests passed! Contact form is working correctly.")
        else:
            print("\n⚠️  Some tests failed. Please check the configuration.")
    else:
        print("\n⚠️  Email configuration test failed. Skipping contact form test.")
        print("Please ensure RESEND_API_KEY is properly configured in .env file")
    
    print("\n")