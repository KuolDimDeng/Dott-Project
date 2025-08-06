"""
Django management command to purge all user data
Run with: python manage.py purge_all_users
"""
from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction, connection
from django.contrib.auth import get_user_model
from django.apps import apps

User = get_user_model()

class Command(BaseCommand):
    help = 'Purge all user data for fresh start'

    def get_model_safe(self, app_label, model_name):
        """Safely get a model, return None if not found"""
        try:
            return apps.get_model(app_label, model_name)
        except LookupError:
            return None
    
    def table_exists(self, table_name):
        """Check if a table exists in the database"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = %s
                );
            """, [table_name])
            return cursor.fetchone()[0]
    
    def handle(self, *args, **options):
        self.stdout.write("\n=== DATABASE PURGE UTILITY ===")
        
        # Get models safely
        Tenant = self.get_model_safe('custom_auth', 'Tenant')
        OnboardingProgress = self.get_model_safe('onboarding', 'OnboardingProgress')
        
        # Show current counts
        user_count = User.objects.count()
        tenant_count = Tenant.objects.count() if Tenant else 0
        progress_count = OnboardingProgress.objects.count() if OnboardingProgress else 0
        
        self.stdout.write(f"\nCurrent record counts:")
        self.stdout.write(f"  Users: {user_count}")
        self.stdout.write(f"  Tenants: {tenant_count}")
        self.stdout.write(f"  OnboardingProgress: {progress_count}")
        
        if user_count == 0 and tenant_count == 0 and progress_count == 0:
            self.stdout.write("\nDatabase is already clean!")
            return
        
        # Show sample data
        self.stdout.write("\nSample data that will be deleted:")
        for user in User.objects.all()[:3]:
            self.stdout.write(f"  - User {user.id}: {user.email}")
        
        # Confirm deletion
        self.stdout.write("\n⚠️  WARNING: This will delete ALL user data!")
        response = input("Type 'DELETE' to confirm: ")
        
        if response != "DELETE":
            self.stdout.write("Operation cancelled.")
            return
        
        try:
            with db_transaction.atomic():
                # Delete in correct order to respect foreign key constraints
                
                # 1. Delete OnboardingProgress first (references users)
                if OnboardingProgress:
                    progress_deleted, _ = OnboardingProgress.objects.all().delete()
                    self.stdout.write(f"✓ Deleted {progress_deleted} OnboardingProgress records")
                
                # 2. Delete Users (references tenants)
                user_deleted, _ = User.objects.all().delete()
                self.stdout.write(f"✓ Deleted {user_deleted} User records")
                
                # 3. Delete Tenants last (no dependencies)
                if Tenant:
                    tenant_deleted, _ = Tenant.objects.all().delete()
                    self.stdout.write(f"✓ Deleted {tenant_deleted} Tenant records")
                
                # 4. Clean up any allauth tables if they exist
                if self.table_exists('account_emailaddress'):
                    with connection.cursor() as cursor:
                        cursor.execute("DELETE FROM account_emailaddress")
                        self.stdout.write("✓ Cleaned up account_emailaddress table")
                
                if self.table_exists('socialaccount_socialaccount'):
                    with connection.cursor() as cursor:
                        cursor.execute("DELETE FROM socialaccount_socialaccount")
                        self.stdout.write("✓ Cleaned up socialaccount_socialaccount table")
                
                self.stdout.write(self.style.SUCCESS("\n✅ Database purged successfully!"))
                
                # Verify clean state
                self.stdout.write("\nFinal counts:")
                self.stdout.write(f"  Users: {User.objects.count()}")
                self.stdout.write(f"  Tenants: {Tenant.objects.count() if Tenant else 0}")
                self.stdout.write(f"  OnboardingProgress: {OnboardingProgress.objects.count() if OnboardingProgress else 0}")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n❌ Error: {str(e)}"))