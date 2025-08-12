"""
Management command to process pending payment settlements.
Run this daily via cron job to batch process settlements.

Usage:
    python manage.py process_settlements
    python manage.py process_settlements --minimum 50  # Only process settlements >= $50
    python manage.py process_settlements --dry-run     # Preview without processing
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from decimal import Decimal
import logging

from banking.models import PaymentSettlement
from banking.services.wise_service import WiseSettlementService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process pending payment settlements through Wise'

    def add_arguments(self, parser):
        parser.add_argument(
            '--minimum',
            type=float,
            default=10.0,
            help='Minimum settlement amount to process (default: $10)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview settlements without processing'
        )
        parser.add_argument(
            '--retry-failed',
            action='store_true',
            help='Retry failed settlements from the last 7 days'
        )
        parser.add_argument(
            '--user-id',
            type=str,
            help='Process settlements for specific user only'
        )

    def handle(self, *args, **options):
        minimum_amount = Decimal(str(options['minimum']))
        dry_run = options['dry_run']
        retry_failed = options['retry_failed']
        user_id = options['user_id']
        
        self.stdout.write(self.style.SUCCESS(
            f"{'[DRY RUN] ' if dry_run else ''}Processing settlements >= ${minimum_amount}"
        ))
        
        # Build query
        query = Q(status='pending')
        
        if retry_failed:
            # Include failed settlements from last 7 days
            week_ago = timezone.now() - timedelta(days=7)
            query |= Q(status='failed', failed_at__gte=week_ago)
        
        # Filter by minimum amount
        query &= Q(settlement_amount__gte=minimum_amount)
        
        # Filter by user if specified
        if user_id:
            query &= Q(user_id=user_id)
        
        # Get settlements to process
        settlements = PaymentSettlement.objects.filter(query).order_by('created_at')
        
        total_count = settlements.count()
        total_amount = sum(s.settlement_amount for s in settlements)
        
        if total_count == 0:
            self.stdout.write(self.style.WARNING('No settlements to process'))
            return
        
        self.stdout.write(f"Found {total_count} settlements totaling ${total_amount}")
        
        if dry_run:
            # Preview settlements
            self.stdout.write("\nSettlements to process:")
            for settlement in settlements[:10]:  # Show first 10
                self.stdout.write(
                    f"  - {settlement.id}: User {settlement.user_id} - "
                    f"${settlement.settlement_amount} {settlement.currency}"
                )
            if total_count > 10:
                self.stdout.write(f"  ... and {total_count - 10} more")
            return
        
        # Process settlements
        service = WiseSettlementService()
        successful = 0
        failed = 0
        skipped = 0
        
        for settlement in settlements:
            try:
                # Check if user has Wise account
                from banking.models import WiseItem
                wise_item = WiseItem.objects.filter(
                    user=settlement.user,
                    is_verified=True
                ).first()
                
                if not wise_item:
                    self.stdout.write(self.style.WARNING(
                        f"Skipping {settlement.id}: User has no Wise account"
                    ))
                    skipped += 1
                    continue
                
                self.stdout.write(f"Processing {settlement.id}...")
                
                # Mark as processing
                settlement.status = 'processing'
                settlement.processed_at = timezone.now()
                settlement.save()
                
                # Process the settlement
                if service.process_settlement(settlement):
                    successful += 1
                    self.stdout.write(self.style.SUCCESS(
                        f"  ✓ Processed ${settlement.settlement_amount} for user {settlement.user_id}"
                    ))
                else:
                    failed += 1
                    self.stdout.write(self.style.ERROR(
                        f"  ✗ Failed to process {settlement.id}: {settlement.failure_reason}"
                    ))
                    
            except Exception as e:
                failed += 1
                logger.error(f"Error processing settlement {settlement.id}: {str(e)}")
                self.stdout.write(self.style.ERROR(
                    f"  ✗ Error processing {settlement.id}: {str(e)}"
                ))
                
                # Mark as failed
                settlement.status = 'failed'
                settlement.failed_at = timezone.now()
                settlement.failure_reason = str(e)
                settlement.save()
        
        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write(self.style.SUCCESS(f"Successfully processed: {successful}"))
        if failed > 0:
            self.stdout.write(self.style.ERROR(f"Failed: {failed}"))
        if skipped > 0:
            self.stdout.write(self.style.WARNING(f"Skipped (no Wise account): {skipped}"))
        
        # Send admin notification if there were failures
        if failed > 0:
            self.send_admin_notification(successful, failed, skipped)
    
    def send_admin_notification(self, successful, failed, skipped):
        """Send email notification to admin about settlement processing results."""
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            
            subject = f"Settlement Processing Report - {failed} Failed"
            message = f"""
            Daily settlement processing completed:
            
            Successfully processed: {successful}
            Failed: {failed}
            Skipped (no Wise account): {skipped}
            
            Please check the logs for details on failed settlements.
            """
            
            # Uncomment in production
            # send_mail(
            #     subject,
            #     message,
            #     settings.DEFAULT_FROM_EMAIL,
            #     [settings.ADMIN_EMAIL],
            #     fail_silently=False,
            # )
            
            logger.info(f"Admin notification: {successful} successful, {failed} failed")
            
        except Exception as e:
            logger.error(f"Error sending admin notification: {str(e)}")