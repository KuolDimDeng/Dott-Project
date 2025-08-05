# taxes/management/commands/setup_tax_abuse_controls.py
from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from taxes.models import TaxDataEntryControl
from custom_auth.models import Tenant
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Set up initial tax data abuse control settings for all tenants'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-id',
            type=str,
            help='Set up controls for a specific tenant only'
        )
        parser.add_argument(
            '--hourly-limit',
            type=int,
            default=100,
            help='Maximum entries per hour (default: 100)'
        )
        parser.add_argument(
            '--daily-limit',
            type=int,
            default=1000,
            help='Maximum entries per day (default: 1000)'
        )
        parser.add_argument(
            '--monthly-limit',
            type=int,
            default=10000,
            help='Maximum entries per month (default: 10000)'
        )
    
    def handle(self, *args, **options):
        tenant_id = options.get('tenant_id')
        hourly_limit = options['hourly_limit']
        daily_limit = options['daily_limit']
        monthly_limit = options['monthly_limit']
        
        control_types = [
            'income_tax_rates',
            'payroll_filings',
            'tax_forms',
            'api_calls'
        ]
        
        try:
            with db_transaction.atomic():
                if tenant_id:
                    # Set up for specific tenant
                    tenants = [tenant_id]
                    self.stdout.write(f"Setting up controls for tenant {tenant_id}")
                else:
                    # Set up for all active tenants
                    tenants = Tenant.objects.filter(is_active=True).values_list('id', flat=True)
                    self.stdout.write(f"Setting up controls for {len(tenants)} active tenants")
                
                created_count = 0
                updated_count = 0
                
                for tenant_id in tenants:
                    for control_type in control_types:
                        control, created = TaxDataEntryControl.objects.update_or_create(
                            tenant_id=tenant_id,
                            control_type=control_type,
                            defaults={
                                'max_entries_per_hour': hourly_limit,
                                'max_entries_per_day': daily_limit,
                                'max_entries_per_month': monthly_limit,
                                'is_active': True
                            }
                        )
                        
                        if created:
                            created_count += 1
                        else:
                            updated_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully set up tax abuse controls:\n"
                        f"  - Created: {created_count} new controls\n"
                        f"  - Updated: {updated_count} existing controls\n"
                        f"  - Limits: {hourly_limit}/hour, {daily_limit}/day, {monthly_limit}/month"
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error setting up tax abuse controls: {str(e)}")
            )
            raise