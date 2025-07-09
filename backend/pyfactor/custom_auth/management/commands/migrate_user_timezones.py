from django.core.management.base import BaseCommand
from django.db import transaction
from custom_auth.models import User


class Command(BaseCommand):
    help = 'Migrate existing users to have timezone field set to UTC'

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
                self.style.WARNING('🔍 DRY RUN - No changes will be made')
            )
        
        # Find users without timezone set
        users_without_timezone = User.objects.filter(
            timezone__isnull=True
        ).exclude(
            timezone=''
        )
        
        count = users_without_timezone.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('✅ All users already have timezone set')
            )
            return
        
        self.stdout.write(
            f'📊 Found {count} users without timezone set'
        )
        
        if not dry_run:
            with transaction.atomic():
                updated_count = users_without_timezone.update(timezone='UTC')
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Updated {updated_count} users to UTC timezone'
                    )
                )
        else:
            for user in users_without_timezone[:5]:  # Show first 5 as example
                self.stdout.write(
                    f'  - Would update user: {user.email} → UTC'
                )
            if count > 5:
                self.stdout.write(f'  - ... and {count - 5} more users')
        
        self.stdout.write(
            self.style.SUCCESS('🎉 Timezone migration completed!')
        )