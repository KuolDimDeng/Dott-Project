"""
Django management command to purge all user data
Run with: python manage.py purge_all_users
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress

User = get_user_model()

class Command(BaseCommand):
    help = 'Purge all user data for fresh start'

    def handle(self, *args, **options):
        self.stdout.write("\n=== DATABASE PURGE UTILITY ===")
        
        # Show current counts
        user_count = User.objects.count()
        tenant_count = Tenant.objects.count()
        progress_count = OnboardingProgress.objects.count()
        
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
            with transaction.atomic():
                # Delete in order to respect foreign key constraints
                progress_deleted, _ = OnboardingProgress.objects.all().delete()
                self.stdout.write(f"✓ Deleted {progress_deleted} OnboardingProgress records")
                
                tenant_deleted, _ = Tenant.objects.all().delete()
                self.stdout.write(f"✓ Deleted {tenant_deleted} Tenant records")
                
                user_deleted, _ = User.objects.all().delete()
                self.stdout.write(f"✓ Deleted {user_deleted} User records")
                
                self.stdout.write(self.style.SUCCESS("\n✅ Database purged successfully!"))
                
                # Verify clean state
                self.stdout.write("\nFinal counts:")
                self.stdout.write(f"  Users: {User.objects.count()}")
                self.stdout.write(f"  Tenants: {Tenant.objects.count()}")
                self.stdout.write(f"  OnboardingProgress: {OnboardingProgress.objects.count()}")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n❌ Error: {str(e)}"))