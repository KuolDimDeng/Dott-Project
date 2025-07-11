#!/usr/bin/env python
"""
Script to update user role
Usage: python manage.py shell < scripts/update_user_role.py
"""

from django.contrib.auth import get_user_model

User = get_user_model()

# Change these values as needed
USER_EMAIL = 'support@dottapps.com'
NEW_ROLE = 'OWNER'

try:
    user = User.objects.get(email=USER_EMAIL)
    old_role = user.role
    user.role = NEW_ROLE
    user.save()
    
    print(f"✅ Successfully updated user role:")
    print(f"   Email: {user.email}")
    print(f"   Old Role: {old_role}")
    print(f"   New Role: {user.role}")
    
    # Also check if user has a tenant
    if hasattr(user, 'tenant_id') and user.tenant_id:
        print(f"   Tenant ID: {user.tenant_id}")
    
except User.DoesNotExist:
    print(f"❌ User with email '{USER_EMAIL}' not found")
except Exception as e:
    print(f"❌ Error updating user role: {str(e)}")