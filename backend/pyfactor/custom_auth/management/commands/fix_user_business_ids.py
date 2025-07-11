"""
Management command to fix missing business_id on users.
Sets user.business_id to match their tenant.id
"""
import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from custom_auth.models import User

logger = logging.getLogger('pyfactor')


class Command(BaseCommand):
    help = 'Fix missing business_id on users by setting it to their tenant.id'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes'
        )
        parser.add_argument(
            '--user-email',
            type=str,
            help='Fix a specific user by email'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        user_email = options['user_email']
        
        self.stdout.write("Starting business_id fix...")
        
        # Build query
        query = User.objects.filter(business_id__isnull=True)
        if user_email:
            query = query.filter(email=user_email)
        
        # Get users with missing business_id
        users_to_fix = query.select_related('tenant').all()
        
        if not users_to_fix:
            self.stdout.write(self.style.SUCCESS("No users found with missing business_id"))
            return
        
        self.stdout.write(f"Found {len(users_to_fix)} users with missing business_id")
        
        fixed_count = 0
        skipped_count = 0
        
        for user in users_to_fix:
            if not user.tenant:
                self.stdout.write(self.style.WARNING(
                    f"Skipping {user.email} - no tenant assigned"
                ))
                skipped_count += 1
                continue
            
            if dry_run:
                self.stdout.write(
                    f"Would set business_id for {user.email} to {user.tenant.id}"
                )
            else:
                try:
                    with transaction.atomic():
                        user.business_id = user.tenant.id
                        user.save(update_fields=['business_id'])
                        self.stdout.write(self.style.SUCCESS(
                            f"✓ Fixed {user.email} - set business_id to {user.business_id}"
                        ))
                        fixed_count += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f"✗ Failed to fix {user.email}: {str(e)}"
                    ))
                    skipped_count += 1
        
        # Summary
        self.stdout.write("\n" + "="*50)
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No changes made"))
            self.stdout.write(f"Would fix: {len(users_to_fix) - skipped_count} users")
            self.stdout.write(f"Would skip: {skipped_count} users")
        else:
            self.stdout.write(self.style.SUCCESS(f"Fixed: {fixed_count} users"))
            if skipped_count:
                self.stdout.write(self.style.WARNING(f"Skipped: {skipped_count} users"))