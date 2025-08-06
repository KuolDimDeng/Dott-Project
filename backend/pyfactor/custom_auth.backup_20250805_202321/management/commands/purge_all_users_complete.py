from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction, connection
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
try:
    from accounts.models_auth0 import OnboardingProgress, Auth0User, UserTenantRole
    from accounts.models_auth0 import Tenant as AccountsTenant
except ImportError:
    OnboardingProgress = None
    Auth0User = None
    UserTenantRole = None
    AccountsTenant = None

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
            with db_transaction.atomic():
                # Count records before deletion
                user_count = User.objects.count()
                tenant_count = Tenant.objects.count()
                auth0_user_count = Auth0User.objects.count() if Auth0User else 0
                accounts_tenant_count = AccountsTenant.objects.count() if AccountsTenant else 0
                progress_count = OnboardingProgress.objects.count() if OnboardingProgress else 0
                role_count = UserTenantRole.objects.count() if UserTenantRole else 0

                self.stdout.write(f"\n📊 Current data:")
                self.stdout.write(f"   - Django Users (auth_user): {user_count}")
                self.stdout.write(f"   - Auth0 Users: {auth0_user_count}")
                self.stdout.write(f"   - Custom Auth Tenants: {tenant_count}")
                self.stdout.write(f"   - Accounts Tenants: {accounts_tenant_count}")
                self.stdout.write(f"   - Onboarding Progress: {progress_count}")
                self.stdout.write(f"   - User Tenant Roles: {role_count}")

                # Delete all onboarding progress records
                if OnboardingProgress:
                    self.stdout.write("\n🔄 Deleting onboarding progress records...")
                    progress_deleted, _ = OnboardingProgress.objects.all().delete()
                    self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {progress_deleted} onboarding progress records"))

                # Delete all user-tenant role records
                if UserTenantRole:
                    self.stdout.write("\n🔄 Deleting user-tenant role records...")
                    role_deleted, _ = UserTenantRole.objects.all().delete()
                    self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {role_deleted} user-tenant role records"))

                # Delete all Auth0 user records
                if Auth0User:
                    self.stdout.write("\n🔄 Deleting Auth0 user records...")
                    auth0_deleted, _ = Auth0User.objects.all().delete()
                    self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {auth0_deleted} Auth0 user records"))

                # Delete all tenant records from both models
                self.stdout.write("\n🔄 Deleting custom auth tenant records...")
                tenant_deleted, _ = Tenant.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {tenant_deleted} custom auth tenant records"))

                if AccountsTenant:
                    self.stdout.write("\n🔄 Deleting accounts tenant records...")
                    accounts_tenant_deleted, _ = AccountsTenant.objects.all().delete()
                    self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {accounts_tenant_deleted} accounts tenant records"))

                # Delete all Django user records
                self.stdout.write("\n🔄 Deleting Django user records...")
                user_deleted, _ = User.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {user_deleted} Django user records"))

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
                    
                    # Check onboarding progress table (might be in accounts app)
                    try:
                        cursor.execute("SELECT COUNT(*) FROM accounts_onboardingprogress")
                        progress_count = cursor.fetchone()[0]
                        self.stdout.write(f"   - Onboarding Progress remaining: {progress_count}")
                    except:
                        self.stdout.write(f"   - Onboarding Progress table not found")
                    
                    # Check Auth0 users table
                    try:
                        cursor.execute("SELECT COUNT(*) FROM auth0_users")
                        auth0_count = cursor.fetchone()[0]
                        self.stdout.write(f"   - Auth0 Users remaining: {auth0_count}")
                    except:
                        self.stdout.write(f"   - Auth0 Users table not found")
                    
                    # Check accounts tenant table
                    try:
                        cursor.execute("SELECT COUNT(*) FROM accounts_tenant")
                        accounts_tenant_count = cursor.fetchone()[0]
                        self.stdout.write(f"   - Accounts Tenants remaining: {accounts_tenant_count}")
                    except:
                        self.stdout.write(f"   - Accounts Tenant table not found")

                # Reset any sequences if using PostgreSQL
                if connection.vendor == 'postgresql':
                    self.stdout.write("\n🔄 Resetting PostgreSQL sequences...")
                    with connection.cursor() as cursor:
                        # Reset auth_user sequence
                        cursor.execute("SELECT setval('auth_user_id_seq', 1, false)")
                        self.stdout.write("   ✅ Reset auth_user sequence")

                self.stdout.write(self.style.SUCCESS('\n✅ All user data has been successfully purged!'))
                self.stdout.write('\n📝 Summary:')
                self.stdout.write(f'   - Django Users deleted: {user_deleted}')
                if Auth0User:
                    self.stdout.write(f'   - Auth0 Users deleted: {auth0_deleted}')
                self.stdout.write(f'   - Custom Auth Tenants deleted: {tenant_deleted}')
                if AccountsTenant:
                    self.stdout.write(f'   - Accounts Tenants deleted: {accounts_tenant_deleted}')
                if OnboardingProgress:
                    self.stdout.write(f'   - Onboarding progress deleted: {progress_deleted}')
                if UserTenantRole:
                    self.stdout.write(f'   - User-Tenant roles deleted: {role_deleted}')
                self.stdout.write(self.style.SUCCESS('\n🎉 Database is now clean and ready for fresh testing!\n'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error during purge: {str(e)}'))
            self.stdout.write(self.style.ERROR('Transaction rolled back - no data was deleted.'))
            raise