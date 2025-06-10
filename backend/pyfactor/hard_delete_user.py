#!/usr/bin/env python
"""
Hard delete a user and all associated data for testing purposes
WARNING: This permanently deletes data - use only for testing!
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.contrib.auth import get_user_model
from custom_auth.models import Tenant, AccountDeletionLog
from onboarding.models import OnboardingProgress

User = get_user_model()

def hard_delete_user(email):
    """Completely remove a user and all associated data"""
    print(f"🗑️  HARD DELETE USER: {email}")
    print("=" * 50)
    
    try:
        user = User.objects.get(email=email)
        user_id = user.id
        tenant_id = user.tenant.id if user.tenant else None
        
        print(f"Found user: {user.email} (ID: {user_id})")
        print(f"Associated tenant: {tenant_id}")
        
        # Delete onboarding progress
        progress_deleted = OnboardingProgress.objects.filter(user=user).delete()
        print(f"✅ Deleted onboarding progress: {progress_deleted}")
        
        # Delete tenant if user is owner
        if tenant_id:
            tenant = Tenant.objects.filter(id=tenant_id).first()
            if tenant and str(tenant.owner_id) == str(user_id):
                tenant.delete()
                print(f"✅ Deleted tenant: {tenant_id}")
        
        # Delete account deletion logs
        logs_deleted = AccountDeletionLog.objects.filter(user_id=user_id).delete()
        print(f"✅ Deleted account deletion logs: {logs_deleted}")
        
        # Finally delete the user
        user.delete()
        print(f"✅ User {email} completely deleted")
        
        print("\n✅ COMPLETE! User can now sign up fresh with this email.")
        
    except User.DoesNotExist:
        print(f"❌ User {email} not found in database")
        print("They may have already been hard deleted or never existed.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        email = input("Enter email to hard delete (e.g. kdeng@dottapps.com): ")
    
    confirm = input(f"\n⚠️  WARNING: This will PERMANENTLY delete {email} and all data.\nType 'DELETE' to confirm: ")
    
    if confirm == "DELETE":
        hard_delete_user(email)
    else:
        print("Cancelled.")