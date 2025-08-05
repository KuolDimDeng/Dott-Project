"""
Django management command to safely delete all users and their associated data
"""
from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction, connection
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from user_sessions.models import UserSession
from payments.models import Payment, Subscription
from session_manager.models import Session
import sys

User = get_user_model()


class Command(BaseCommand):
    help = 'Safely delete all users and their associated data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip confirmation prompt',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        force = options['force']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No data will be deleted'))

        # Show current data counts
        self.stdout.write(self.style.WARNING('\nCurrent data counts:'))
        self._show_counts()

        if not force and not dry_run:
            self.stdout.write(self.style.WARNING('\n⚠️  WARNING: This will delete ALL users and their data!'))
            confirm = input('Are you sure you want to continue? Type "yes" to confirm: ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('Operation cancelled'))
                return

        try:
            with db_transaction.atomic():
                # Delete in correct order to respect foreign keys
                
                # 1. Delete sessions
                count = UserSession.objects.all().count()
                if not dry_run:
                    UserSession.objects.all().delete()
                self.stdout.write(f'✓ Deleted {count} user sessions')
                
                try:
                    count = Session.objects.all().count()
                    if not dry_run:
                        Session.objects.all().delete()
                    self.stdout.write(f'✓ Deleted {count} session manager sessions')
                except Exception as e:
                    self.stdout.write(f'⚠️  Could not delete session manager sessions: {e}')
                
                # 2. Delete payments
                count = Payment.objects.all().count()
                if not dry_run:
                    Payment.objects.all().delete()
                self.stdout.write(f'✓ Deleted {count} payments')
                
                count = Subscription.objects.all().count()
                if not dry_run:
                    Subscription.objects.all().delete()
                self.stdout.write(f'✓ Deleted {count} subscriptions')
                
                # 3. Delete onboarding progress
                count = OnboardingProgress.objects.all().count()
                if not dry_run:
                    OnboardingProgress.objects.all().delete()
                self.stdout.write(f'✓ Deleted {count} onboarding progress records')
                
                # 4. Delete users
                count = User.objects.all().count()
                if not dry_run:
                    User.objects.all().delete()
                self.stdout.write(f'✓ Deleted {count} users')
                
                # 5. Delete tenants
                count = Tenant.objects.all().count()
                if not dry_run:
                    Tenant.objects.all().delete()
                self.stdout.write(f'✓ Deleted {count} tenants')
                
                if dry_run:
                    # Rollback the transaction in dry run mode
                    raise Exception("Dry run - rolling back")
                
        except Exception as e:
            if dry_run and "Dry run" in str(e):
                self.stdout.write(self.style.SUCCESS('\nDry run completed - no data was deleted'))
            else:
                self.stdout.write(self.style.ERROR(f'\nError: {e}'))
                return

        if not dry_run:
            self.stdout.write(self.style.SUCCESS('\n✅ All user data deleted successfully!'))
            self.stdout.write(self.style.WARNING('\nFinal data counts:'))
            self._show_counts()

    def _show_counts(self):
        """Show counts of all relevant tables"""
        with connection.cursor() as cursor:
            tables = [
                ('user_sessions', 'User Sessions'),
                ('session_manager_session', 'Session Manager'),
                ('payments_payment', 'Payments'),
                ('payments_subscription', 'Subscriptions'),
                ('onboarding_onboardingprogress', 'Onboarding Progress'),
                ('custom_auth_user', 'Users'),
                ('custom_auth_tenant', 'Tenants'),
            ]
            
            for table_name, display_name in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    self.stdout.write(f"  {display_name}: {count}")
                except Exception as e:
                    self.stdout.write(f"  {display_name}: Error - {e}")