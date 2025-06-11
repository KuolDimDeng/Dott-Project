from django.core.management.base import BaseCommand
from django.db import transaction, connection
from django.contrib.auth import get_user_model

# Import models from accounts app
from accounts.models_auth0 import OnboardingProgress, Auth0User, UserTenantRole, Tenant

User = get_user_model()

class Command(BaseCommand):
    help = 'Completely purge all users and related data from the accounts models'

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
                "- All Django User records\n"
                "- All Auth0User records\n"
                "- All Tenant records\n"
                "- All OnboardingProgress records\n"
                "- All UserTenantRole records\n"
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
                auth0_user_count = Auth0User.objects.count()
                tenant_count = Tenant.objects.count()
                progress_count = OnboardingProgress.objects.count()
                role_count = UserTenantRole.objects.count()

                self.stdout.write(f"\n📊 Current data:")
                self.stdout.write(f"   - Django Users (auth_user): {user_count}")
                self.stdout.write(f"   - Auth0 Users: {auth0_user_count}")
                self.stdout.write(f"   - Tenants: {tenant_count}")
                self.stdout.write(f"   - Onboarding Progress: {progress_count}")
                self.stdout.write(f"   - User Tenant Roles: {role_count}")

                # Delete all onboarding progress records
                self.stdout.write("\n🔄 Deleting onboarding progress records...")
                progress_deleted, _ = OnboardingProgress.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {progress_deleted} onboarding progress records"))

                # Delete all user-tenant role records
                self.stdout.write("\n🔄 Deleting user-tenant role records...")
                role_deleted, _ = UserTenantRole.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {role_deleted} user-tenant role records"))

                # Delete all Auth0 user records
                self.stdout.write("\n🔄 Deleting Auth0 user records...")
                auth0_deleted, _ = Auth0User.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {auth0_deleted} Auth0 user records"))

                # Delete all tenant records
                self.stdout.write("\n🔄 Deleting tenant records...")
                tenant_deleted, _ = Tenant.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"   ✅ Deleted {tenant_deleted} tenant records"))

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
                    
                    # Check auth0_users table
                    try:
                        cursor.execute("SELECT COUNT(*) FROM auth0_users")
                        auth0_count = cursor.fetchone()[0]
                        self.stdout.write(f"   - Auth0 Users remaining: {auth0_count}")
                    except:
                        self.stdout.write(f"   - Auth0 Users table not found")
                    
                    # Check tenants table
                    try:
                        cursor.execute("SELECT COUNT(*) FROM tenants")
                        tenant_count = cursor.fetchone()[0]
                        self.stdout.write(f"   - Tenants remaining: {tenant_count}")
                    except:
                        self.stdout.write(f"   - Tenants table not found")
                    
                    # Check onboarding progress table
                    try:
                        cursor.execute("SELECT COUNT(*) FROM onboarding_progress")
                        progress_count = cursor.fetchone()[0]
                        self.stdout.write(f"   - Onboarding Progress remaining: {progress_count}")
                    except:
                        self.stdout.write(f"   - Onboarding Progress table not found")
                    
                    # Check user tenant roles table
                    try:
                        cursor.execute("SELECT COUNT(*) FROM user_tenant_roles")
                        role_count = cursor.fetchone()[0]
                        self.stdout.write(f"   - User Tenant Roles remaining: {role_count}")
                    except:
                        self.stdout.write(f"   - User Tenant Roles table not found")

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
                self.stdout.write(f'   - Auth0 Users deleted: {auth0_deleted}')
                self.stdout.write(f'   - Tenants deleted: {tenant_deleted}')
                self.stdout.write(f'   - Onboarding progress deleted: {progress_deleted}')
                self.stdout.write(f'   - User-Tenant roles deleted: {role_deleted}')
                self.stdout.write(self.style.SUCCESS('\n🎉 Database is now clean and ready for fresh testing!\n'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error during purge: {str(e)}'))
            self.stdout.write(self.style.ERROR('Transaction rolled back - no data was deleted.'))
            raise