"""
Database Purge Commands for Render Console

Copy and paste these commands into your Django shell:
python manage.py shell

Then run these commands one by one:
"""

# 1. Import required models
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from django.db import transaction

User = get_user_model()

# 2. Check current counts
print("=== BEFORE PURGE ===")
user_count = User.objects.count()
tenant_count = Tenant.objects.count()
progress_count = OnboardingProgress.objects.count()
print(f"Users: {user_count}")
print(f"Tenants: {tenant_count}")
print(f"OnboardingProgress: {progress_count}")

# 3. Show some sample data to confirm we're targeting the right records
print("\n=== SAMPLE DATA ===")
print("Sample users:")
for user in User.objects.all()[:5]:
    print(f"  - User {user.id}: {user.email}")

print("Sample tenants:")
for tenant in Tenant.objects.all()[:5]:
    print(f"  - Tenant {tenant.id}: {tenant.name} (owner_id: {tenant.owner_id})")

# 4. PURGE DATA (uncomment these lines after confirming above looks correct)
print("\n=== STARTING PURGE ===")
print("WARNING: This will delete ALL user data!")
confirm = input("Type 'DELETE ALL DATA' to confirm: ")

if confirm == "DELETE ALL DATA":
    with transaction.atomic():
        # Delete in order (foreign key constraints)
        progress_deleted = OnboardingProgress.objects.all().delete()
        print(f"Deleted OnboardingProgress: {progress_deleted}")
        
        tenant_deleted = Tenant.objects.all().delete()
        print(f"Deleted Tenants: {tenant_deleted}")
        
        user_deleted = User.objects.all().delete()
        print(f"Deleted Users: {user_deleted}")
        
        print("✅ PURGE COMPLETE!")
else:
    print("❌ Purge cancelled")

# 5. Verify clean state
print("\n=== AFTER PURGE ===")
user_count = User.objects.count()
tenant_count = Tenant.objects.count()
progress_count = OnboardingProgress.objects.count()
print(f"Users: {user_count}")
print(f"Tenants: {tenant_count}")
print(f"OnboardingProgress: {progress_count}")

if user_count == 0 and tenant_count == 0 and progress_count == 0:
    print("✅ Database is clean - ready for fresh user registration!")
else:
    print("⚠️  Some records still exist")