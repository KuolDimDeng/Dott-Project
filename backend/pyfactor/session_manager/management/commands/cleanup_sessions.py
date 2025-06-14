"""
Management command to clean up expired sessions
Run periodically via cron or scheduled task
"""

import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from session_manager.services import session_service

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up expired sessions'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        self.stdout.write('Starting session cleanup...')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No sessions will be deleted'))
        
        try:
            if dry_run:
                # Count expired sessions
                from session_manager.models import UserSession
                expired_count = UserSession.objects.filter(
                    expires_at__lt=timezone.now()
                ).count()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Would delete {expired_count} expired sessions'
                    )
                )
            else:
                # Actually clean up sessions
                count = session_service.cleanup_expired_sessions()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully cleaned up {count} expired sessions'
                    )
                )
                
                if verbose:
                    # Show additional statistics
                    active_count = session_service.get_active_sessions_count()
                    self.stdout.write(f'Active sessions remaining: {active_count}')
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during cleanup: {str(e)}')
            )
            logger.error(f'Session cleanup error: {str(e)}', exc_info=True)