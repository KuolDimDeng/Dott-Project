#!/usr/bin/env python
"""
Convert existing Django superuser to AdminUser for admin panel
Run this on production: python manage.py shell < convert_superuser_to_admin.py
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from notifications.models import AdminUser

User = get_user_model()

print("🔄 Converting existing superuser to AdminUser...")

# Find existing superusers
superusers = User.objects.filter(is_superuser=True, is_active=True)
print(f"   Found {superusers.count()} superuser(s)")

if superusers.count() == 0:
    print("   ❌ No superusers found!")
    print("   💡 Create one first: python manage.py createsuperuser")
    exit(1)

for superuser in superusers:
    print(f"   📋 Processing superuser: {superuser.username} ({superuser.email})")
    
    # Check if AdminUser already exists for this user
    existing_admin = AdminUser.objects.filter(
        username=superuser.username
    ).first()
    
    if existing_admin:
        print(f"      ⚠️  AdminUser already exists for {superuser.username}")
        print(f"         Email: {existing_admin.email}")
        print(f"         Active: {existing_admin.is_active}")
        print(f"         Role: {existing_admin.admin_role}")
        continue
    
    # Create AdminUser from superuser
    admin_user = AdminUser(
        username=superuser.username,
        email=superuser.email,
        first_name=superuser.first_name or 'Admin',
        last_name=superuser.last_name or 'User',
        admin_role='super_admin',
        can_send_notifications=True,
        can_view_all_users=True,
        can_view_feedback=True,
        can_moderate_content=True,
        is_active=superuser.is_active
    )
    
    # Copy the password hash directly (they both use Django's password system)
    admin_user.password = superuser.password
    admin_user.save()
    
    print(f"      ✅ Created AdminUser for {superuser.username}")
    print(f"         Email: {admin_user.email}")
    print(f"         Role: {admin_user.admin_role}")
    print(f"         Password: Same as your Django superuser password")

# List all AdminUsers
print("")
print("📋 Current AdminUsers:")
for admin in AdminUser.objects.all():
    print(f"   - {admin.username} ({admin.email}) - {admin.admin_role} - Active: {admin.is_active}")

print("")
print("🎯 You can now login to admin panel with your existing superuser credentials!")
print("   Go to: https://dottapps.com/admin")
print("   Use your Django superuser username and password")