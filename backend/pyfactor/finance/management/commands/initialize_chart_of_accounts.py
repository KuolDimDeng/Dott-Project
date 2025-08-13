"""
Management command to initialize Chart of Accounts for existing users
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from finance.chart_of_accounts_init import initialize_for_existing_tenant
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Initialize Chart of Accounts for existing users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email of the user to initialize Chart of Accounts for'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Initialize for all users without Chart of Accounts'
        )

    def handle(self, *args, **options):
        if options['email']:
            # Initialize for specific user
            email = options['email']
            self.stdout.write(f"Initializing Chart of Accounts for {email}...")
            
            result = initialize_for_existing_tenant(email)
            
            if result['success']:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✅ Successfully initialized {result['created']} accounts for {email}"
                    )
                )
                if result.get('existing', 0) > 0:
                    self.stdout.write(
                        f"   (User already had {result['existing']} existing accounts)"
                    )
            else:
                self.stdout.write(
                    self.style.ERROR(f"❌ Failed: {result['message']}")
                )
        
        elif options['all']:
            # Initialize for all users without Chart of Accounts
            from finance.models import Account
            
            users_without_accounts = []
            for user in User.objects.filter(tenant_id__isnull=False):
                account_count = Account.objects.filter(tenant_id=user.tenant_id).count()
                if account_count == 0:
                    users_without_accounts.append(user.email)
            
            if not users_without_accounts:
                self.stdout.write(
                    self.style.SUCCESS("All users already have Chart of Accounts initialized")
                )
                return
            
            self.stdout.write(f"Found {len(users_without_accounts)} users without Chart of Accounts")
            
            success_count = 0
            for email in users_without_accounts:
                result = initialize_for_existing_tenant(email)
                if result['success']:
                    success_count += 1
                    self.stdout.write(f"✅ {email}: {result['created']} accounts created")
                else:
                    self.stdout.write(
                        self.style.WARNING(f"⚠️  {email}: {result['message']}")
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nCompleted: {success_count}/{len(users_without_accounts)} users initialized"
                )
            )
        
        else:
            self.stdout.write(
                self.style.ERROR("Please specify --email or --all")
            )