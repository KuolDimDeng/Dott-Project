"""
Management command to populate cached tax rates for all users
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from taxes.services.tax_cache_service import TaxRateCacheService
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Populate cached tax rates for all active users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            help='Only update users in specific tenant ID',
        )
        parser.add_argument(
            '--user',
            type=str,
            help='Only update specific user by email',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update even if cache is fresh',
        )

    def handle(self, *args, **options):
        tenant_id = options.get('tenant')
        user_email = options.get('user')
        force = options.get('force', False)
        
        self.stdout.write(self.style.SUCCESS('Starting tax cache population...'))
        
        # Build query
        query = User.objects.filter(is_active=True)
        
        if tenant_id:
            query = query.filter(tenant_id=tenant_id)
            self.stdout.write(f'Filtering by tenant: {tenant_id}')
        
        if user_email:
            query = query.filter(email=user_email)
            self.stdout.write(f'Filtering by user: {user_email}')
        
        total_users = query.count()
        self.stdout.write(f'Found {total_users} users to process')
        
        updated = 0
        skipped = 0
        failed = 0
        
        for user in query:
            try:
                # Check if cache exists and is fresh (unless forced)
                if not force:
                    profile = hasattr(user, 'profile') and user.profile
                    if profile and profile.cached_tax_rate is not None:
                        if profile.cached_tax_updated_at:
                            from django.utils import timezone
                            age_hours = (timezone.now() - profile.cached_tax_updated_at).total_seconds() / 3600
                            if age_hours < 24:
                                self.stdout.write(
                                    self.style.WARNING(
                                        f'Skipping {user.email} - cache is {age_hours:.1f} hours old'
                                    )
                                )
                                skipped += 1
                                continue
                
                # Update cache
                result = TaxRateCacheService.update_user_cached_tax_rate(user)
                
                if result.get("success"):
                    rate = result.get("rate_percentage", 0)
                    jurisdiction = result.get("jurisdiction", "Unknown")
                    source = result.get("source", "none")
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ {user.email}: {rate:.1f}% - {jurisdiction} ({source})'
                        )
                    )
                    updated += 1
                else:
                    error = result.get("error", "Unknown error")
                    self.stdout.write(
                        self.style.ERROR(
                            f'✗ {user.email}: {error}'
                        )
                    )
                    failed += 1
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ {user.email}: Exception - {str(e)}'
                    )
                )
                failed += 1
        
        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(f'Updated: {updated}'))
        if skipped > 0:
            self.stdout.write(self.style.WARNING(f'Skipped (fresh cache): {skipped}'))
        if failed > 0:
            self.stdout.write(self.style.ERROR(f'Failed: {failed}'))
        self.stdout.write(self.style.SUCCESS(f'Total processed: {updated + skipped + failed}/{total_users}'))
        
        # Provide helpful next steps
        if failed > 0:
            self.stdout.write('\n' + self.style.WARNING(
                'Some users failed. Common reasons:\n'
                '- No business location configured\n'
                '- No user profile exists\n'
                '- Database connection issues\n'
                'Run with specific user email to debug: --user=email@example.com'
            ))
        
        if updated > 0:
            self.stdout.write('\n' + self.style.SUCCESS(
                f'✅ Successfully cached tax rates for {updated} users!\n'
                'POS will now load tax rates instantly from cache.'
            ))