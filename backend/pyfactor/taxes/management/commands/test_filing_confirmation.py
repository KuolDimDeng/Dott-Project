"""
Management command to test the filing confirmation system.

Usage:
    python manage.py test_filing_confirmation [--filing-id=UUID]
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
import uuid

from taxes.models import TaxFiling, FilingConfirmation
from taxes.confirmations.confirmation_generator import ConfirmationGenerator
from custom_auth.models import User


class Command(BaseCommand):
    help = 'Test the tax filing confirmation system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--filing-id',
            type=str,
            help='UUID of an existing filing to generate confirmation for'
        )
        parser.add_argument(
            '--create-test-filing',
            action='store_true',
            help='Create a test filing if none exists'
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Email address for test notifications'
        )
        parser.add_argument(
            '--tenant-id',
            type=int,
            default=1,
            help='Tenant ID to use for test data'
        )

    def handle(self, *args, **options):
        filing_id = options.get('filing_id')
        create_test = options.get('create_test_filing')
        email = options.get('email')
        tenant_id = options.get('tenant_id')

        if filing_id:
            # Use existing filing
            try:
                filing = TaxFiling.objects.get(filing_id=filing_id)
                self.stdout.write(self.style.SUCCESS(f'Using existing filing: {filing_id}'))
            except TaxFiling.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Filing {filing_id} not found'))
                return
        elif create_test:
            # Create test filing
            filing = self.create_test_filing(email, tenant_id)
            self.stdout.write(self.style.SUCCESS(f'Created test filing: {filing.filing_id}'))
        else:
            # Find most recent filing
            filing = TaxFiling.objects.filter(
                status__in=['submitted', 'accepted', 'completed']
            ).order_by('-created').first()
            
            if not filing:
                self.stdout.write(self.style.ERROR('No eligible filings found. Use --create-test-filing to create one.'))
                return
            
            self.stdout.write(self.style.SUCCESS(f'Using most recent filing: {filing.filing_id}'))

        # Generate confirmation
        self.stdout.write('Generating confirmation...')
        
        try:
            generator = ConfirmationGenerator()
            confirmation = generator.generate_confirmation(filing)
            
            self.stdout.write(self.style.SUCCESS(f'\nConfirmation generated successfully!'))
            self.stdout.write(f'Confirmation Number: {confirmation.confirmation_number}')
            self.stdout.write(f'Generated At: {confirmation.generated_at}')
            self.stdout.write(f'PDF Receipt Available: {"Yes" if confirmation.pdf_receipt else "No"}')
            
            # Show notification details
            notifications = confirmation.notifications.all()
            self.stdout.write(f'\nNotifications Sent: {notifications.count()}')
            
            for notification in notifications:
                self.stdout.write(f'\n{notification.get_notification_type_display()}:')
                self.stdout.write(f'  Recipient: {notification.recipient}')
                self.stdout.write(f'  Status: {notification.get_status_display()}')
                if notification.error_message:
                    self.stdout.write(f'  Error: {notification.error_message}')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error generating confirmation: {str(e)}'))
            import traceback
            traceback.print_exc()

    def create_test_filing(self, email=None, tenant_id=1):
        """Create a test filing for demonstration purposes."""
        # Get or create a test user
        if email:
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'tenant_id': tenant_id,
                    'first_name': 'Test',
                    'last_name': 'User',
                    'is_active': True
                }
            )
        else:
            user = User.objects.filter(tenant_id=tenant_id).first()
            if not user:
                user = User.objects.create(
                    email='test@example.com',
                    tenant_id=tenant_id,
                    first_name='Test',
                    last_name='User',
                    is_active=True
                )

        # Create test filing
        filing = TaxFiling.objects.create(
            tenant_id=tenant_id,
            tax_type='sales',
            service_type='fullService',
            status='submitted',
            price=Decimal('99.00'),
            filing_period='Q1 2024',
            filing_year=2024,
            filing_quarter=1,
            due_date=timezone.now().date(),
            payment_status='completed',
            payment_completed_at=timezone.now(),
            submitted_at=timezone.now(),
            user_email=user.email,
            taxpayer=user,
            
            # Additional fields for confirmation
            filing_type='quarterly',
            tax_year=2024,
            state='CA',
            payment_amount=Decimal('1250.00'),
            payment_method='Credit Card',
            
            # Tax calculation details
            total_sales=Decimal('15000.00'),
            taxable_sales=Decimal('14000.00'),
            tax_collected=Decimal('1225.00'),
            tax_due=Decimal('1250.00'),
            
            # Metadata
            filing_data={
                'business_name': 'Test Business LLC',
                'business_address': '123 Test St, San Francisco, CA 94111',
                'ein': '12-3456789',
                'filing_frequency': 'quarterly'
            }
        )

        return filing