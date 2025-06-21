#!/usr/bin/env python
"""
Delete a user and all related data

Usage:
    python manage.py shell < scripts/delete_user.py
"""

import os
import sys
import django

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User

email = "jubacargovillage@gmail.com"

print("=" * 70)
print(f"🗑️  DELETING USER: {email}")
print("=" * 70)

try:
    with transaction.atomic():
        user = User.objects.get(email=email)
        print(f"\n✅ Found user: {email}")
        print(f"   - User ID: {user.id}")
        print(f"   - Tenant: {user.tenant.name if user.tenant else 'None'}")
        
        # Delete will cascade to all related objects (sessions, onboarding progress, etc.)
        user.delete()
        
        print(f"\n✅ User {email} and all related data deleted successfully")
        print("\nUser can now sign up fresh and go through onboarding normally")
        
except User.DoesNotExist:
    print(f"\n❌ User {email} not found - may already be deleted")
except Exception as e:
    print(f"\n❌ Error deleting user: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)