"""
Management command to validate tax rate updates
Usage: python manage.py validate_tax_updates --file=updates.json --apply
"""
import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal

from taxes.models.tax_validation import GlobalSalesTaxRateStaging, TaxRateValidationBatch
from taxes.services.tax_validation_service import TaxRateValidator


class Command(BaseCommand):
    help = 'Validate and optionally apply tax rate updates'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='JSON file with tax updates'
        )
        parser.add_argument(
            '--batch-id',
            type=str,
            help='Batch ID for existing batch'
        )
        parser.add_argument(
            '--load',
            action='store_true',
            help='Load data into staging'
        )
        parser.add_argument(
            '--validate',
            action='store_true',
            help='Validate staged data'
        )
        parser.add_argument(
            '--approve',
            action='store_true',
            help='Approve batch for production'
        )
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Apply approved changes to production'
        )
        parser.add_argument(
            '--report',
            action='store_true',
            help='Generate validation report'
        )
        parser.add_argument(
            '--user',
            type=str,
            default='admin',
            help='Username for approval'
        )
    
    def handle(self, *args, **options):
        # Get user
        try:
            user = User.objects.get(username=options['user'])
        except User.DoesNotExist:
            user = User.objects.first()
            self.stdout.write(f"User {options['user']} not found, using {user.username}")
        
        # Create or get validator
        batch_id = options.get('batch_id')
        validator = TaxRateValidator(batch_id)
        
        # Load data if requested
        if options.get('load') and options.get('file'):
            self.load_staging_data(options['file'], validator.batch_id)
        
        # Validate if requested
        if options.get('validate'):
            self.validate_data(validator)
        
        # Generate report if requested
        if options.get('report'):
            self.generate_report(validator)
        
        # Approve if requested
        if options.get('approve'):
            self.approve_batch(validator.batch_id, user)
        
        # Apply if requested
        if options.get('apply'):
            self.apply_changes(validator.batch_id, user)
    
    def load_staging_data(self, filename, batch_id):
        """Load tax updates into staging table"""
        self.stdout.write(f"Loading data from {filename}...")
        
        with open(filename, 'r') as f:
            data = json.load(f)
        
        loaded = 0
        for country_code, updates in data.items():
            # Create staging record
            staging = GlobalSalesTaxRateStaging(
                country=country_code,
                batch_id=batch_id,
                effective_date=timezone.now().date()
            )
            
            # Set fields from updates
            for field, value in updates.items():
                if hasattr(staging, field):
                    # Convert decimals
                    if field in ['rate', 'manual_filing_fee', 'online_filing_fee', 'penalty_rate']:
                        value = Decimal(str(value))
                    setattr(staging, field, value)
            
            staging.save()
            loaded += 1
        
        self.stdout.write(self.style.SUCCESS(f"Loaded {loaded} records into staging"))
    
    def validate_data(self, validator):
        """Run validation on staged data"""
        self.stdout.write("Validating staged data...")
        
        # Basic validation
        is_valid, errors = validator.validate_staging_data()
        
        if not is_valid:
            self.stdout.write(self.style.ERROR(f"Validation failed with {len(errors)} errors:"))
            for error in errors[:10]:  # Show first 10
                self.stdout.write(f"  - {error}")
            return
        
        self.stdout.write(self.style.SUCCESS("Basic validation passed"))
        
        # Compare with production
        changes = validator.compare_with_production()
        
        # Show summary
        self.stdout.write("\nChange Summary:")
        self.stdout.write(f"  Critical changes: {len(changes['critical'])}")
        self.stdout.write(f"  Warning changes: {len(changes['warning'])}")
        self.stdout.write(f"  Info changes: {len(changes['info'])}")
        
        # Show critical changes
        if changes['critical']:
            self.stdout.write(self.style.WARNING("\nCritical changes requiring review:"))
            for change in changes['critical'][:5]:
                self.stdout.write(
                    f"  {change['country']} - {change['field']}: "
                    f"{change['old']} → {change['new']}"
                )
        
        # Create batch
        batch = validator.create_validation_batch(None)
        self.stdout.write(self.style.SUCCESS(f"\nCreated batch: {batch.batch_id}"))
    
    def generate_report(self, validator):
        """Generate detailed validation report"""
        batch = TaxRateValidationBatch.objects.get(batch_id=validator.batch_id)
        
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"TAX RATE VALIDATION REPORT")
        self.stdout.write(f"Batch ID: {batch.batch_id}")
        self.stdout.write(f"Created: {batch.created_date}")
        self.stdout.write(f"Status: {batch.status}")
        self.stdout.write(f"{'='*60}")
        
        # Summary
        self.stdout.write(f"\nSUMMARY:")
        self.stdout.write(f"  Total changes: {batch.total_changes}")
        self.stdout.write(f"  Countries affected: {batch.countries_affected}")
        self.stdout.write(f"  Critical changes: {batch.critical_changes}")
        self.stdout.write(f"  Warning changes: {batch.warning_changes}")
        
        # Change breakdown
        summary = batch.get_change_summary()
        self.stdout.write(f"\nCHANGES BY TYPE:")
        for change_type, count in summary.items():
            self.stdout.write(f"  {change_type}: {count}")
        
        # Critical changes detail
        from taxes.models.tax_validation import TaxRateChangeLog
        critical = TaxRateChangeLog.objects.filter(
            batch_id=batch.batch_id,
            severity='critical'
        )
        
        if critical.exists():
            self.stdout.write(f"\nCRITICAL CHANGES DETAIL:")
            for change in critical[:10]:
                self.stdout.write(
                    f"  {change.country_name} - {change.field_name}: "
                    f"{change.old_value} → {change.new_value} "
                    f"({change.change_percentage}% change)"
                )
        
        self.stdout.write(f"\n{'='*60}")
    
    def approve_batch(self, batch_id, user):
        """Approve a batch for production"""
        batch = TaxRateValidationBatch.objects.get(batch_id=batch_id)
        
        if batch.status != 'pending':
            self.stdout.write(self.style.ERROR(f"Batch is {batch.status}, cannot approve"))
            return
        
        # Mark all changes as approved
        from taxes.models.tax_validation import TaxRateChangeLog
        changes = TaxRateChangeLog.objects.filter(batch_id=batch_id)
        changes.update(
            approved=True,
            approved_by=user,
            approved_date=timezone.now()
        )
        
        # Update batch
        batch.status = 'approved'
        batch.reviewed_by = user
        batch.reviewed_date = timezone.now()
        batch.save()
        
        self.stdout.write(self.style.SUCCESS(f"Batch {batch_id} approved by {user.username}"))
    
    def apply_changes(self, batch_id, user):
        """Apply approved changes to production"""
        validator = TaxRateValidator(batch_id)
        batch = TaxRateValidationBatch.objects.get(batch_id=batch_id)
        
        try:
            count = validator.apply_approved_changes(batch, user)
            self.stdout.write(
                self.style.SUCCESS(f"Successfully applied {count} changes to production")
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error applying changes: {e}"))