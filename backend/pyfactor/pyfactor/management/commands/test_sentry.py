from django.core.management.base import BaseCommand
import sentry_sdk

class Command(BaseCommand):
    help = 'Test Sentry integration by triggering a test error'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Testing Sentry integration...'))
        
        # Send a test message
        sentry_sdk.capture_message("Test message from Django backend", level="info")
        self.stdout.write(self.style.SUCCESS('✅ Test message sent to Sentry'))
        
        # Trigger a test error (uncomment to test error reporting)
        # raise Exception("This is a test error from Django backend!")
        
        self.stdout.write(self.style.SUCCESS('Sentry test completed successfully!'))