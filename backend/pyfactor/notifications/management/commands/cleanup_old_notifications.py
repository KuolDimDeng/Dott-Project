"""
Django management command to clean up notifications older than 90 days
Run daily as a cron job or scheduled task
"""
import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from notifications.models import Notification, NotificationRecipient, AdminAuditLog

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up notifications older than 90 days'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days to retain notifications (default: 90)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of records to delete per batch (default: 1000)',
        )

    def handle(self, *args, **options):
        days_to_retain = options['days']
        dry_run = options['dry_run']
        batch_size = options['batch_size']
        
        cutoff_date = timezone.now() - timedelta(days=days_to_retain)
        
        self.stdout.write(f"Cleaning up notifications older than {days_to_retain} days...")
        self.stdout.write(f"Cutoff date: {cutoff_date}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No data will be deleted"))
        
        try:
            # Count notifications to be deleted
            old_notifications = Notification.objects.filter(created_at__lt=cutoff_date)
            notification_count = old_notifications.count()
            
            # Count recipients to be deleted (cascade delete)
            recipient_count = NotificationRecipient.objects.filter(
                notification__created_at__lt=cutoff_date
            ).count()
            
            self.stdout.write(
                f"Found {notification_count} notifications and "
                f"{recipient_count} recipients to clean up"
            )
            
            if notification_count == 0:
                self.stdout.write(self.style.SUCCESS("No old notifications to clean up"))
                return
            
            if not dry_run:
                # Delete in batches to avoid memory issues
                deleted_total = 0
                
                with transaction.atomic():
                    while True:
                        # Get batch of notification IDs
                        batch_ids = list(
                            old_notifications.values_list('id', flat=True)[:batch_size]
                        )
                        
                        if not batch_ids:
                            break
                        
                        # Delete batch
                        deleted_count = Notification.objects.filter(
                            id__in=batch_ids
                        ).delete()[0]
                        
                        deleted_total += deleted_count
                        
                        self.stdout.write(
                            f"Deleted batch of {deleted_count} notifications "
                            f"(total: {deleted_total}/{notification_count})"
                        )
                    
                    # Log the cleanup action
                    AdminAuditLog.objects.create(
                        admin_user=None,  # System action
                        action='cleanup_notifications',
                        details={
                            'notifications_deleted': notification_count,
                            'recipients_deleted': recipient_count,
                            'retention_days': days_to_retain,
                            'cutoff_date': cutoff_date.isoformat(),
                        },
                        ip_address='system',
                        user_agent='cleanup_old_notifications command',
                        success=True
                    )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully cleaned up {notification_count} notifications "
                        f"and {recipient_count} recipients"
                    )
                )
            else:
                # Dry run - show sample of what would be deleted
                sample_notifications = old_notifications[:10]
                self.stdout.write("\nSample of notifications that would be deleted:")
                for notif in sample_notifications:
                    self.stdout.write(
                        f"  - {notif.title} (created: {notif.created_at}, "
                        f"recipients: {notif.total_recipients})"
                    )
                
                if notification_count > 10:
                    self.stdout.write(f"  ... and {notification_count - 10} more")
        
        except Exception as e:
            logger.error(f"Error cleaning up old notifications: {str(e)}", exc_info=True)
            self.stdout.write(
                self.style.ERROR(f"Error cleaning up notifications: {str(e)}")
            )
            
            # Log the failed cleanup attempt
            AdminAuditLog.objects.create(
                admin_user=None,  # System action
                action='cleanup_notifications',
                details={
                    'retention_days': days_to_retain,
                    'cutoff_date': cutoff_date.isoformat(),
                },
                ip_address='system',
                user_agent='cleanup_old_notifications command',
                success=False,
                error_message=str(e)
            )
            
            raise