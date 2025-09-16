"""
Django management command to auto-approve high-confidence staging items
Run via cron: python manage.py auto_approve_staging
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
import logging

from inventory.models_staging import StoreItemStaging, ModeratorAction
from inventory.models_storeitems import StoreItem

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Auto-approve high-confidence staging items'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Print detailed information',
        )
        parser.add_argument(
            '--min-confidence',
            type=float,
            default=0.80,
            help='Minimum confidence score (default: 0.80)',
        )
        parser.add_argument(
            '--min-submissions',
            type=int,
            default=3,
            help='Minimum number of submissions (default: 3)',
        )

    def handle(self, *args, **options):
        # Check if the staging tables exist
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'inventory_storeitemstaging'
                );
            """)
            table_exists = cursor.fetchone()[0]

        if not table_exists:
            self.stdout.write(self.style.ERROR(
                'Staging tables do not exist! Please run migrations first:\n'
                'python manage.py migrate inventory'
            ))
            return 'Migration required'

        dry_run = options['dry_run']
        verbose = options['verbose']
        min_confidence = Decimal(str(options['min_confidence']))
        min_submissions = options['min_submissions']

        self.stdout.write(self.style.SUCCESS(f'Starting auto-approval process...'))

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Get eligible staging items
        eligible_items = StoreItemStaging.objects.filter(
            status='pending',
            submission_count__gte=min_submissions,
            confidence_score__gte=min_confidence,
            image_is_safe=True  # Only approve items with safe images
        )

        # Filter by time in staging (24+ hours)
        min_staging_time = timezone.now() - timezone.timedelta(hours=24)
        eligible_items = eligible_items.filter(submission_date__lte=min_staging_time)

        total_eligible = eligible_items.count()
        self.stdout.write(f'Found {total_eligible} eligible items for auto-approval')

        approved_count = 0
        skipped_count = 0
        error_count = 0

        for item in eligible_items:
            try:
                # Double-check eligibility
                can_approve, reason = item.can_auto_approve()

                if not can_approve:
                    if verbose:
                        self.stdout.write(
                            self.style.WARNING(
                                f'Skipping {item.barcode} - {item.name}: {reason}'
                            )
                        )
                    skipped_count += 1
                    continue

                if dry_run:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Would approve: {item.barcode} - {item.name} '
                            f'(confidence: {item.confidence_score}, '
                            f'submissions: {item.submission_count})'
                        )
                    )
                    approved_count += 1
                else:
                    with transaction.atomic():
                        # Approve the item
                        store_item = item.approve(auto=True)

                        # Log the auto-approval
                        ModeratorAction.objects.create(
                            moderator=None,  # System action
                            action='approve',
                            staging_item=item,
                            reason=f'Auto-approved: {reason}'
                        )

                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Approved: {item.barcode} - {item.name} '
                                f'(confidence: {item.confidence_score}, '
                                f'submissions: {item.submission_count})'
                            )
                        )
                        approved_count += 1

                        if verbose:
                            self.stdout.write(
                                f'  Created StoreItem ID: {store_item.id}'
                            )

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'Error processing {item.barcode}: {str(e)}'
                    )
                )
                logger.error(f'Auto-approval error for {item.barcode}: {str(e)}', exc_info=True)

        # Summary
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS('Auto-approval process completed'))
        self.stdout.write(f'Total eligible: {total_eligible}')
        self.stdout.write(f'Approved: {approved_count}')
        self.stdout.write(f'Skipped: {skipped_count}')
        self.stdout.write(f'Errors: {error_count}')

        # Check items close to approval threshold
        if verbose:
            self.stdout.write('\n' + '=' * 50)
            self.stdout.write('Items close to approval threshold:')

            close_items = StoreItemStaging.objects.filter(
                status='pending',
                confidence_score__gte=min_confidence - Decimal('0.10'),
                confidence_score__lt=min_confidence
            ).order_by('-confidence_score')[:10]

            for item in close_items:
                self.stdout.write(
                    f'  {item.barcode} - {item.name}: '
                    f'confidence={item.confidence_score}, '
                    f'submissions={item.submission_count}'
                )

        return f'Processed {approved_count} items'