"""
Management command to test SMS sending functionality
Usage: python manage.py test_sms +1234567890
"""

from django.core.management.base import BaseCommand, CommandError
from custom_auth.sms_service import sms_service
import re

class Command(BaseCommand):
    help = 'Test SMS sending functionality with Twilio'

    def add_arguments(self, parser):
        parser.add_argument(
            'phone_number',
            help='Phone number to send test SMS to (e.g., +15551234567)'
        )
        parser.add_argument(
            '--message',
            default='Test message from Dott app! 📱',
            help='Custom message to send (default: test message)'
        )

    def handle(self, *args, **options):
        phone_number = options['phone_number']
        message = options['message']
        
        # Validate phone number format
        if not re.match(r'^\+\d{10,15}$', phone_number):
            raise CommandError(
                'Invalid phone number format. Use international format: +1234567890'
            )
        
        self.stdout.write(f"🔄 Testing SMS to {phone_number}...")
        
        try:
            # Check if SMS service is configured
            if not sms_service.twilio_client and not sms_service.at_available:
                self.stdout.write(
                    self.style.WARNING(
                        '⚠️ No SMS service configured. Please check your environment variables:'
                    )
                )
                self.stdout.write('   TWILIO_ACCOUNT_SID')
                self.stdout.write('   TWILIO_AUTH_TOKEN') 
                self.stdout.write('   TWILIO_PHONE_NUMBER')
                return
            
            # Test phone verification first
            is_valid, verify_message = sms_service.verify_phone_number(phone_number)
            if not is_valid:
                self.stdout.write(
                    self.style.WARNING(f"⚠️ Phone verification: {verify_message}")
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Phone verification: {verify_message}")
                )
            
            # Generate test OTP
            test_otp = '123456'
            
            # Send test SMS
            success, status_message, message_sid = sms_service.send_otp(phone_number, test_otp)
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f"✅ SMS sent successfully!")
                )
                self.stdout.write(f"   Message SID: {message_sid}")
                self.stdout.write(f"   Status: {status_message}")
                
                # Check delivery status
                if message_sid:
                    delivery_status = sms_service.check_delivery_status(message_sid)
                    self.stdout.write(f"   Delivery Status: {delivery_status}")
                
            else:
                self.stdout.write(
                    self.style.ERROR(f"❌ SMS sending failed: {status_message}")
                )
                
        except Exception as e:
            raise CommandError(f"SMS test failed: {str(e)}")