"""
Management command to migrate existing users to have timezone set
This handles existing users who signed up before timezone support was added
"""

from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from custom_auth.models import User
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migrate existing users to have timezone set to UTC if not already set'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of users to process at once (default: 100)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        batch_size = options['batch_size']
        
        # Find users without timezone set
        users_without_timezone = User.objects.filter(timezone__isnull=True)
        total_users = users_without_timezone.count()
        
        if total_users == 0:
            self.stdout.write(
                self.style.SUCCESS('All users already have timezone set!')
            )
            return
        
        self.stdout.write(
            self.style.WARNING(f'Found {total_users} users without timezone set')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN - No changes will be made')
            )
            
            # Show sample of users that would be updated
            sample_users = users_without_timezone[:10]
            for user in sample_users:
                self.stdout.write(f'Would update: {user.email} → timezone: UTC')
            
            if total_users > 10:
                self.stdout.write(f'... and {total_users - 10} more users')
            
            return
        
        # Process users in batches
        updated_count = 0
        
        try:
            with db_transaction.atomic():
                for user in users_without_timezone.iterator(chunk_size=batch_size):
                    user.timezone = 'UTC'
                    user.save(update_fields=['timezone'])
                    updated_count += 1
                    
                    if updated_count % batch_size == 0:
                        self.stdout.write(f'Updated {updated_count}/{total_users} users...')
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully updated {updated_count} users with timezone=UTC'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error updating users: {str(e)}')
            )
            logger.error(f'Error in migrate_user_timezones command: {str(e)}')
            raise