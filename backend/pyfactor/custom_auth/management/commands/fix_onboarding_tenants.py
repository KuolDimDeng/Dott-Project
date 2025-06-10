from django.core.management.base import BaseCommand
from django.db import transaction
from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix OnboardingProgress records with missing tenant_id values'

    def handle(self, *args, **options):
        self.stdout.write("Starting OnboardingProgress tenant relationship fix...")
        
        # Counter for statistics
        fixed_count = 0
        already_correct_count = 0
        no_tenant_count = 0
        total_count = 0
        
        # Get all OnboardingProgress records
        progress_records = OnboardingProgress.objects.all()
        total_count = progress_records.count()
        self.stdout.write(f"Found {total_count} onboarding progress records")
        
        with transaction.atomic():
            for progress in progress_records:
                user = progress.user
                
                # Check if tenant_id is already set correctly
                if progress.tenant_id:
                    # Verify it's a valid tenant
                    tenant = Tenant.objects.filter(id=progress.tenant_id).first()
                    if tenant:
                        already_correct_count += 1
                        continue
                    else:
                        self.stdout.write(self.style.WARNING(
                            f"Progress for {user.email} has invalid tenant_id: {progress.tenant_id}"
                        ))
                
                # Find the correct tenant for this user
                tenant = None
                
                # First check if user has tenant field set
                if hasattr(user, 'tenant') and user.tenant:
                    tenant = user.tenant
                    self.stdout.write(f"Found tenant via user.tenant: {tenant.id} for {user.email}")
                else:
                    # Check if user owns a tenant
                    tenant = Tenant.objects.filter(owner_id=user.id).first()
                    if tenant:
                        self.stdout.write(f"Found tenant via owner_id: {tenant.id} for {user.email}")
                        # Also update user.tenant for consistency
                        user.tenant = tenant
                        user.save(update_fields=['tenant'])
                
                if tenant:
                    # Update the OnboardingProgress tenant_id
                    progress.tenant_id = tenant.id
                    progress.save(update_fields=['tenant_id'])
                    self.stdout.write(self.style.SUCCESS(
                        f"Fixed OnboardingProgress for {user.email} - set tenant_id to {tenant.id}"
                    ))
                    fixed_count += 1
                else:
                    self.stdout.write(self.style.ERROR(
                        f"No tenant found for user {user.email}"
                    ))
                    no_tenant_count += 1
                    
                    # If user has completed onboarding but no tenant, this is a serious issue
                    if progress.onboarding_status == 'complete' or progress.setup_completed:
                        self.stdout.write(self.style.ERROR(
                            f"CRITICAL: User {user.email} completed onboarding but has no tenant!"
                        ))
        
        self.stdout.write("\n=== Summary ===")
        self.stdout.write(f"Total progress records: {total_count}")
        self.stdout.write(f"Fixed: {fixed_count}")
        self.stdout.write(f"Already correct: {already_correct_count}")
        self.stdout.write(f"No tenant found: {no_tenant_count}")
        
        # Additional check: Find users with completed onboarding but no tenant in progress
        self.stdout.write("\n=== Checking for users with tenant but no progress tenant_id ===")
        
        users_with_tenants = User.objects.filter(tenant__isnull=False)
        problematic_count = 0
        
        for user in users_with_tenants:
            try:
                progress = OnboardingProgress.objects.get(user=user)
                if not progress.tenant_id or str(progress.tenant_id) != str(user.tenant.id):
                    self.stdout.write(self.style.WARNING(
                        f"User {user.email} has tenant {user.tenant.id} but progress has tenant_id: {progress.tenant_id}"
                    ))
                    problematic_count += 1
                    
                    # Fix it
                    progress.tenant_id = user.tenant.id
                    progress.save(update_fields=['tenant_id'])
                    self.stdout.write(self.style.SUCCESS(
                        f"Fixed progress tenant_id for {user.email}"
                    ))
            except OnboardingProgress.DoesNotExist:
                # User has tenant but no onboarding progress - this is okay for old users
                pass
        
        if problematic_count > 0:
            self.stdout.write(self.style.SUCCESS(
                f"\nFixed {problematic_count} additional mismatched tenant relationships"
            ))