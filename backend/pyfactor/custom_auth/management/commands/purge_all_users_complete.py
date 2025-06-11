from django.core.management.base import BaseCommand
from django.db import transaction, connection
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant, OnboardingProgress

User = get_user_model()

class Command(BaseCommand):
    help = 'Completely purge all users and related data from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force deletion without confirmation',
        )

    def handle(self, *args, **options):
        if not options['force']:
            confirm = input(
                "\n⚠️  WARNING: This will DELETE ALL user data including:\n"
                "- All User records\n"
                "- All Tenant records\n"
                "- All OnboardingProgress records\n"
                "- All related data\n\n"
                "Are you sure you want to continue? Type 'yes' to confirm: "
            )
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.WARNING('Operation cancelled.'))
                return

        self.stdout.write(self.style.WARNING('\n🗑️  Starting complete user data purge...'))

        try:
            with transaction.atomic():
                # Count records before deletion
                user_count = User.objects.count()
                tenant_count = Tenant.objects.count()
                progress_count = OnboardingProgress.objects.count()

                self.stdout.write(f"\n📊 Current data:")
                self.stdout.write(f"   - Users: {user_count}")
                self.stdout.write(f"   - Tenants: {tenant_count}")
                self.stdout.write(f"   - Onboarding Progress: {progress_count}")

                # Delete all onboarding progress records
                self.stdout.write("\n🔄 Deleting onboarding progress records...")
                progress_deleted, _ = OnboardingProgress.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {progress_deleted} onboarding progress records"))

                # Delete all tenant records
                self.stdout.write("\n🔄 Deleting tenant records...")
                tenant_deleted, _ = Tenant.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {tenant_deleted} tenant records"))

                # Delete all user records
                self.stdout.write("\n🔄 Deleting user records...")
                user_deleted, _ = User.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {user_deleted} user records"))

                # Verify cleanup with raw SQL
                self.stdout.write("\n🔍 Verifying cleanup with raw SQL...")
                
                with connection.cursor() as cursor:
                    # Check users table
                    cursor.execute("SELECT COUNT(*) FROM auth_user")
                    user_count = cursor.fetchone()[0]
                    self.stdout.write(f"   - Users remaining: {user_count}")
                    
                    # Check tenants table
                    cursor.execute("SELECT COUNT(*) FROM custom_auth_tenant")
                    tenant_count = cursor.fetchone()[0]
                    self.stdout.write(f"   - Tenants remaining: {tenant_count}")
                    
                    # Check onboarding progress table
                    cursor.execute("SELECT COUNT(*) FROM custom_auth_onboardingprogress")
                    progress_count = cursor.fetchone()[0]
                    self.stdout.write(f"   - Onboarding Progress remaining: {progress_count}")

                # Reset any sequences if using PostgreSQL
                if connection.vendor == 'postgresql':
                    self.stdout.write("\n🔄 Resetting PostgreSQL sequences...")
                    with connection.cursor() as cursor:
                        # Reset auth_user sequence
                        cursor.execute("SELECT setval('auth_user_id_seq', 1, false)")
                        self.stdout.write("   ✅ Reset auth_user sequence")

                self.stdout.write(self.style.SUCCESS('\n✅ All user data has been successfully purged!'))
                self.stdout.write('\n📝 Summary:')
                self.stdout.write(f'   - Users deleted: {user_deleted}')
                self.stdout.write(f'   - Tenants deleted: {tenant_deleted}')
                self.stdout.write(f'   - Onboarding progress deleted: {progress_deleted}')
                self.stdout.write(self.style.SUCCESS('\n🎉 Database is now clean and ready for fresh testing!\n'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error during purge: {str(e)}'))
            self.stdout.write(self.style.ERROR('Transaction rolled back - no data was deleted.'))
            raise