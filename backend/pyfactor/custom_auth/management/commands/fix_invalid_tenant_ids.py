from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress
import uuid


class Command(BaseCommand):
    help = 'Fix invalid tenant IDs in OnboardingProgress records'

    def handle(self, *args, **options):
        self.stdout.write("Checking for invalid tenant IDs in OnboardingProgress...")
        
        # Find all OnboardingProgress records with invalid tenant_id
        invalid_tenant_ids = []
        all_progress = OnboardingProgress.objects.all()
        
        for progress in all_progress:
            try:
                # Try to validate the UUID
                uuid.UUID(str(progress.tenant_id))
                # Also check if it's the specific invalid format we're seeing
                if str(progress.tenant_id) == '00000000-0000-0000-0000-00000000000d':
                    invalid_tenant_ids.append(progress)
                    self.stdout.write(self.style.WARNING(
                        f"Found invalid tenant_id format for user {progress.user.email}: {progress.tenant_id}"
                    ))
            except (ValueError, AttributeError):
                invalid_tenant_ids.append(progress)
                self.stdout.write(self.style.WARNING(
                    f"Found invalid tenant_id for user {progress.user.email}: {progress.tenant_id}"
                ))
        
        if not invalid_tenant_ids:
            self.stdout.write(self.style.SUCCESS("No invalid tenant IDs found!"))
            return
        
        self.stdout.write(f"\nFound {len(invalid_tenant_ids)} records with invalid tenant IDs")
        
        # Fix each invalid record
        fixed_count = 0
        with db_transaction.atomic():
            for progress in invalid_tenant_ids:
                user = progress.user
                
                # Find the correct tenant for this user
                tenant = None
                
                # Check if user has tenant field set
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
                    old_tenant_id = progress.tenant_id
                    progress.tenant_id = tenant.id
                    progress.save(update_fields=['tenant_id'])
                    self.stdout.write(self.style.SUCCESS(
                        f"Fixed tenant_id for {user.email}: {old_tenant_id} -> {tenant.id}"
                    ))
                    fixed_count += 1
                else:
                    # User has no tenant - this is a problem
                    self.stdout.write(self.style.ERROR(
                        f"No tenant found for user {user.email} - cannot fix tenant_id"
                    ))
                    
                    # If they've completed onboarding but have no tenant, create one
                    if progress.onboarding_status == 'complete' or progress.setup_completed:
                        self.stdout.write(f"Creating tenant for completed user {user.email}")
                        tenant = Tenant.objects.create(
                            name=f"{user.email.split('@')[0]}'s Business",
                            owner_id=user.id,
                            is_active=True,
                            rls_enabled=True
                        )
                        user.tenant = tenant
                        user.save(update_fields=['tenant'])
                        progress.tenant_id = tenant.id
                        progress.save(update_fields=['tenant_id'])
                        self.stdout.write(self.style.SUCCESS(
                            f"Created tenant {tenant.id} for {user.email}"
                        ))
                        fixed_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f"\nFixed {fixed_count} out of {len(invalid_tenant_ids)} invalid tenant IDs"
        ))