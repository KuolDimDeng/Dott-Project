from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress

User = get_user_model()

class Command(BaseCommand):
    help = 'Purge all user data for fresh start'

    def handle(self, *args, **options):
        self.stdout.write("⚠️  WARNING: This will delete ALL user data!")
        
        response = input("Type 'DELETE ALL DATA' to confirm: ")
        if response != "DELETE ALL DATA":
            self.stdout.write("Operation cancelled.")
            return
        
        try:
            with db_transaction.atomic():
                # Show counts before deletion
                user_count = User.objects.count()
                tenant_count = Tenant.objects.count()
                progress_count = OnboardingProgress.objects.count()
                
                self.stdout.write(f"Deleting {progress_count} OnboardingProgress records...")
                OnboardingProgress.objects.all().delete()
                
                self.stdout.write(f"Deleting {tenant_count} Tenant records...")
                Tenant.objects.all().delete()
                
                self.stdout.write(f"Deleting {user_count} User records...")
                User.objects.all().delete()
                
                self.stdout.write(self.style.SUCCESS("✅ All user data purged successfully!"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))