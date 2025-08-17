"""
Management command to generate tax period summaries
"""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Sum, Count, Q
from taxes.models import TaxAccount, TaxTransaction, TaxPeriodSummary

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Generate tax period summaries for reporting'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--period-start',
            type=str,
            help='Period start date (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--period-end',
            type=str,
            help='Period end date (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--tenant-id',
            type=str,
            help='Generate for specific tenant only',
        )
        parser.add_argument(
            '--tax-account-id',
            type=str,
            help='Generate for specific tax account only',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Dry run - show what would be generated without creating records',
        )
    
    def handle(self, *args, **options):
        """
        Generate tax summaries for the specified period
        """
        # Parse dates
        if options['period_start']:
            period_start = datetime.strptime(options['period_start'], '%Y-%m-%d').date()
        else:
            # Default to start of current month
            today = timezone.now().date()
            period_start = today.replace(day=1)
        
        if options['period_end']:
            period_end = datetime.strptime(options['period_end'], '%Y-%m-%d').date()
        else:
            # Default to end of current month
            today = timezone.now().date()
            next_month = today.replace(day=28) + timedelta(days=4)
            period_end = (next_month - timedelta(days=next_month.day)).date()
        
        self.stdout.write(f"Generating tax summaries for period: {period_start} to {period_end}")
        
        # Build filter for tax accounts
        tax_account_filter = {}
        if options['tenant_id']:
            tax_account_filter['tenant_id'] = options['tenant_id']
        if options['tax_account_id']:
            tax_account_filter['id'] = options['tax_account_id']
        
        # Get all active tax accounts
        tax_accounts = TaxAccount.objects.filter(
            is_active=True,
            **tax_account_filter
        )
        
        self.stdout.write(f"Found {tax_accounts.count()} tax accounts to process")
        
        summaries_created = 0
        summaries_updated = 0
        
        for tax_account in tax_accounts:
            try:
                # Check if summary already exists
                summary, created = TaxPeriodSummary.objects.get_or_create(
                    tenant_id=tax_account.tenant_id,
                    tax_account=tax_account,
                    period_start=period_start,
                    period_end=period_end,
                    defaults={
                        'filing_status': 'PENDING'
                    }
                )
                
                if options['dry_run']:
                    self.stdout.write(f"[DRY RUN] Would {'create' if created else 'update'} summary for {tax_account.name}")
                else:
                    # Get all transactions for this period
                    transactions = TaxTransaction.objects.filter(
                        tenant_id=tax_account.tenant_id,
                        tax_account=tax_account,
                        transaction_date__date__gte=period_start,
                        transaction_date__date__lte=period_end,
                    ).exclude(status='REVERSED')
                    
                    # Calculate totals
                    summary_data = transactions.aggregate(
                        total_tax=Sum('tax_collected'),
                        total_taxable=Sum('taxable_amount'),
                        total_count=Count('id'),
                        exempt_count=Count('id', filter=Q(is_exempt=True))
                    )
                    
                    # Update summary
                    summary.tax_collected = summary_data['total_tax'] or Decimal('0')
                    summary.taxable_sales = summary_data['total_taxable'] or Decimal('0')
                    summary.transaction_count = summary_data['total_count'] or 0
                    summary.exempt_transaction_count = summary_data['exempt_count'] or 0
                    
                    # Calculate total sales (taxable + non-taxable + exempt)
                    summary.total_sales = summary.taxable_sales + summary.non_taxable_sales + summary.exempt_sales
                    
                    # Calculate tax due (collected minus paid)
                    summary.tax_due = summary.tax_collected - summary.tax_paid
                    
                    # Update filing status
                    if summary.tax_due > 0 and period_end < timezone.now().date():
                        # Period has ended and tax is due
                        if tax_account.filing_due_day:
                            # Check if we're past the filing deadline
                            filing_deadline = period_end.replace(day=min(tax_account.filing_due_day, 28))
                            if timezone.now().date() > filing_deadline:
                                summary.filing_status = 'OVERDUE'
                            else:
                                summary.filing_status = 'READY'
                        else:
                            summary.filing_status = 'READY'
                    elif summary.tax_due > 0:
                        summary.filing_status = 'PENDING'
                    else:
                        summary.filing_status = 'PENDING'
                    
                    summary.last_calculated = timezone.now()
                    summary.save()
                    
                    if created:
                        summaries_created += 1
                        self.stdout.write(self.style.SUCCESS(
                            f"✓ Created summary for {tax_account.name}: "
                            f"${summary.tax_collected:.2f} collected from {summary.transaction_count} transactions"
                        ))
                    else:
                        summaries_updated += 1
                        self.stdout.write(self.style.SUCCESS(
                            f"✓ Updated summary for {tax_account.name}: "
                            f"${summary.tax_collected:.2f} collected from {summary.transaction_count} transactions"
                        ))
                        
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f"✗ Error processing {tax_account.name}: {str(e)}"
                ))
                logger.error(f"Error generating tax summary: {str(e)}", exc_info=True)
        
        # Final summary
        self.stdout.write(self.style.SUCCESS(
            f"\nSummary generation complete:"
        ))
        self.stdout.write(f"  - Created: {summaries_created}")
        self.stdout.write(f"  - Updated: {summaries_updated}")
        self.stdout.write(f"  - Period: {period_start} to {period_end}")
        
        if options['dry_run']:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] No records were actually created/updated"))