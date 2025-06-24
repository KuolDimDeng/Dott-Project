from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from audit.models import AuditLog, AuditLogRetention
import logging

logger = logging.getLogger('audit')


class Command(BaseCommand):
    help = 'Clean up old audit logs based on retention policies'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--model',
            type=str,
            help='Clean up logs for a specific model only',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=None,
            help='Override retention days (use with --model)',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        specific_model = options['model']
        override_days = options['days']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No logs will be deleted'))
        
        # Get retention policies
        if specific_model:
            if override_days:
                # Manual cleanup for specific model
                self.cleanup_model_logs(specific_model, override_days, dry_run)
            else:
                # Use policy for specific model
                try:
                    policy = AuditLogRetention.objects.get(
                        model_name=specific_model,
                        is_active=True
                    )
                    self.cleanup_model_logs(specific_model, policy.retention_days, dry_run)
                except AuditLogRetention.DoesNotExist:
                    self.stdout.write(
                        self.style.ERROR(
                            f'No active retention policy for model: {specific_model}'
                        )
                    )
        else:
            # Process all active retention policies
            policies = AuditLogRetention.objects.filter(is_active=True)
            
            if not policies.exists():
                self.stdout.write(
                    self.style.WARNING('No active retention policies found')
                )
                # Default cleanup - keep last 365 days
                self.cleanup_model_logs('*', 365, dry_run)
            else:
                for policy in policies:
                    self.cleanup_model_logs(
                        policy.model_name,
                        policy.retention_days,
                        dry_run
                    )
    
    def cleanup_model_logs(self, model_name, retention_days, dry_run):
        """Clean up logs for a specific model."""
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        
        # Build query
        if model_name == '*':
            # Clean all models
            logs_to_delete = AuditLog.objects.filter(timestamp__lt=cutoff_date)
            model_desc = "all models"
        else:
            logs_to_delete = AuditLog.objects.filter(
                model_name=model_name,
                timestamp__lt=cutoff_date
            )
            model_desc = f"model '{model_name}'"
        
        count = logs_to_delete.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'No logs to delete for {model_desc} '
                    f'(older than {retention_days} days)'
                )
            )
            return
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'Would delete {count} audit logs for {model_desc} '
                    f'(older than {retention_days} days)'
                )
            )
            
            # Show sample of logs that would be deleted
            sample_logs = logs_to_delete[:10]
            for log in sample_logs:
                self.stdout.write(
                    f'  - {log.timestamp}: {log.action} {log.model_name} '
                    f'by {log.user or "Anonymous"}'
                )
            
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more')
        else:
            # Actually delete the logs
            deleted_count, _ = logs_to_delete.delete()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Deleted {deleted_count} audit logs for {model_desc} '
                    f'(older than {retention_days} days)'
                )
            )
            
            # Log the cleanup action
            try:
                AuditLog.log_action(
                    action='deleted',
                    model_name='AuditLog',
                    object_repr=f'Cleanup: {deleted_count} logs for {model_desc}',
                    extra_data={
                        'retention_days': retention_days,
                        'cutoff_date': cutoff_date.isoformat(),
                        'deleted_count': deleted_count,
                    }
                )
            except Exception as e:
                logger.error(f"Failed to log cleanup action: {str(e)}")