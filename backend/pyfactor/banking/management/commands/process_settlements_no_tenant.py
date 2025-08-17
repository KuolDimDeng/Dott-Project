"""
Management command to process pending payment settlements WITHOUT tenant filtering.
This version uses raw SQL to bypass tenant isolation for cron jobs.

Usage:
    python manage.py process_settlements_no_tenant
    python manage.py process_settlements_no_tenant --minimum 50
    python manage.py process_settlements_no_tenant --dry-run
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import connection
from datetime import timedelta
from decimal import Decimal
import logging
import uuid

from banking.models import WiseItem
from banking.services.wise_service import WiseSettlementService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process pending payment settlements through Wise (no tenant filtering)'

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

    def handle(self, *args, **options):
        minimum_amount = Decimal(str(options['minimum']))
        dry_run = options['dry_run']
        retry_failed = options['retry_failed']
        
        self.stdout.write(self.style.SUCCESS(
            f"{'[DRY RUN] ' if dry_run else ''}Processing settlements >= ${minimum_amount} (NO TENANT FILTERING)"
        ))
        
        # Use raw SQL to get settlements without tenant filtering
        with connection.cursor() as cursor:
            # Count total settlements
            cursor.execute("SELECT COUNT(*) FROM banking_payment_settlement")
            total_in_db = cursor.fetchone()[0]
            self.stdout.write(f"Total settlements in database: {total_in_db}")
            
            # Build SQL query
            sql_conditions = ["status = 'pending'"]
            sql_params = []
            
            if retry_failed:
                week_ago = timezone.now() - timedelta(days=7)
                sql_conditions.append("(status = 'failed' AND failed_at >= %s)")
                sql_params.append(week_ago)
            
            sql_conditions.append("settlement_amount >= %s")
            sql_params.append(minimum_amount)
            
            where_clause = " AND ".join(sql_conditions) if sql_conditions else "1=1"
            
            # Get settlements to process
            query = f"""
                SELECT 
                    id, user_id, stripe_payment_intent_id, original_amount,
                    currency, stripe_fee, platform_fee, settlement_amount,
                    status, created_at, tenant_id, pos_transaction_id,
                    customer_email, notes
                FROM banking_payment_settlement
                WHERE {where_clause}
                ORDER BY created_at
            """
            
            cursor.execute(query, sql_params)
            settlements = cursor.fetchall()
            
            total_count = len(settlements)
            total_amount = sum(row[7] for row in settlements)  # settlement_amount is at index 7
            
            if total_count == 0:
                self.stdout.write(self.style.WARNING('No settlements to process'))
                return
            
            self.stdout.write(f"Found {total_count} settlements totaling ${total_amount}")
            
            if dry_run:
                # Preview settlements
                self.stdout.write("\nSettlements to process:")
                for row in settlements[:10]:  # Show first 10
                    self.stdout.write(
                        f"  - {row[0]}: User {row[1]} - "
                        f"${row[7]} {row[4]}"  # settlement_amount and currency
                    )
                if total_count > 10:
                    self.stdout.write(f"  ... and {total_count - 10} more")
                return
            
            # Process settlements
            service = WiseSettlementService()
            successful = 0
            failed = 0
            skipped = 0
            
            for row in settlements:
                settlement_id = row[0]
                user_id = row[1]
                settlement_amount = row[7]
                
                try:
                    self.stdout.write(f"Processing settlement {settlement_id}...")
                    
                    # Get the user's default POS bank account
                    # We need to get the user object first
                    from users.models import User
                    try:
                        user = User.objects.get(id=user_id)
                        wise_item = WiseItem.get_default_pos_account(user)
                        
                        if not wise_item:
                            self.stdout.write(self.style.WARNING(
                                f"Skipping {settlement_id}: User {user_id} has no default POS bank account"
                            ))
                            skipped += 1
                            continue
                    except User.DoesNotExist:
                        self.stdout.write(self.style.WARNING(
                            f"Skipping {settlement_id}: User {user_id} not found"
                        ))
                        skipped += 1
                        continue
                    
                    # Update status to processing
                    cursor.execute(
                        """
                        UPDATE banking_payment_settlement 
                        SET status = 'processing', processed_at = %s 
                        WHERE id = %s
                        """,
                        [timezone.now(), settlement_id]
                    )
                    
                    # Create a minimal settlement object for the service
                    class SettlementProxy:
                        def __init__(self, data):
                            self.id = data[0]
                            self.user_id = data[1]
                            self.user = user
                            self.stripe_payment_intent_id = data[2]
                            self.original_amount = data[3]
                            self.currency = data[4]
                            self.stripe_fee = data[5]
                            self.platform_fee = data[6]
                            self.settlement_amount = data[7]
                            self.status = data[8]
                            self.created_at = data[9]
                            self.failure_reason = None
                        
                        def save(self):
                            # Update in database
                            with connection.cursor() as cursor:
                                cursor.execute(
                                    """
                                    UPDATE banking_payment_settlement 
                                    SET status = %s, failure_reason = %s
                                    WHERE id = %s
                                    """,
                                    [self.status, self.failure_reason, self.id]
                                )
                    
                    settlement_obj = SettlementProxy(row)
                    
                    # Process the settlement
                    if service.process_settlement(settlement_obj):
                        successful += 1
                        self.stdout.write(self.style.SUCCESS(
                            f"  ✓ Processed ${settlement_amount} for user {user_id}"
                        ))
                    else:
                        failed += 1
                        self.stdout.write(self.style.ERROR(
                            f"  ✗ Failed to process {settlement_id}"
                        ))
                        
                except Exception as e:
                    failed += 1
                    logger.error(f"Error processing settlement {settlement_id}: {str(e)}")
                    self.stdout.write(self.style.ERROR(
                        f"  ✗ Error processing {settlement_id}: {str(e)}"
                    ))
                    
                    # Mark as failed
                    cursor.execute(
                        """
                        UPDATE banking_payment_settlement 
                        SET status = 'failed', failed_at = %s, failure_reason = %s
                        WHERE id = %s
                        """,
                        [timezone.now(), str(e), settlement_id]
                    )
        
        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write(self.style.SUCCESS(f"Successfully processed: {successful}"))
        if failed > 0:
            self.stdout.write(self.style.ERROR(f"Failed: {failed}"))
        if skipped > 0:
            self.stdout.write(self.style.WARNING(f"Skipped (no Wise account): {skipped}"))