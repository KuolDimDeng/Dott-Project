from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import Subscription
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process expired grace periods and suspend subscriptions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )
        
        now = timezone.now()
        
        # Find subscriptions with expired grace periods
        expired_grace_periods = Subscription.objects.filter(
            status__in=['past_due', 'grace_period'],
            grace_period_ends__lte=now,
            grace_period_ends__isnull=False
        )
        
        suspended_count = 0
        
        for subscription in expired_grace_periods:
            self.stdout.write(
                f"Processing subscription {subscription.id} (plan: {subscription.selected_plan}, "
                f"grace period ended: {subscription.grace_period_ends})"
            )
            
            if not dry_run:
                # Suspend the subscription
                subscription.suspend_subscription()
                
                # Log the suspension
                logger.warning(
                    f"Suspended subscription {subscription.id} for business {subscription.business_id} "
                    f"after grace period expired ({subscription.failed_payment_count} failed attempts)"
                )
                
                # TODO: Send suspension notification email
                # send_subscription_suspended_notification(subscription.business.owner_email)
            
            suspended_count += 1
        
        if suspended_count == 0:
            self.stdout.write(
                self.style.SUCCESS('No expired grace periods found')
            )
        else:
            action = "Would suspend" if dry_run else "Suspended"
            self.stdout.write(
                self.style.SUCCESS(
                    f'{action} {suspended_count} subscription(s) with expired grace periods'
                )
            )
        
        # Also check for subscriptions that should still be in grace period
        active_grace_periods = Subscription.objects.filter(
            status__in=['past_due', 'grace_period'],
            grace_period_ends__gt=now,
            grace_period_ends__isnull=False
        )
        
        if active_grace_periods.exists():
            self.stdout.write(
                self.style.WARNING(
                    f'Found {active_grace_periods.count()} subscription(s) still in grace period'
                )
            )
            
            for subscription in active_grace_periods:
                days_remaining = (subscription.grace_period_ends - now).days
                self.stdout.write(
                    f"  - Subscription {subscription.id}: {days_remaining} days remaining"
                )