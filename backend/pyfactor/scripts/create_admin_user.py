#!/usr/bin/env python
"""
Script to create an admin user for the admin portal
Usage: python manage.py shell < scripts/create_admin_user.py
"""

from notifications.models import AdminUser
from django.utils import timezone

# Admin user details
ADMIN_USERNAME = 'admin'
ADMIN_EMAIL = 'support@dottapps.com'
ADMIN_PASSWORD = 'Admin123!'  # Change this to a secure password
ADMIN_FIRST_NAME = 'Admin'
ADMIN_LAST_NAME = 'User'

try:
    # Check if admin user already exists
    admin_user = AdminUser.objects.filter(username=ADMIN_USERNAME).first()
    
    if admin_user:
        print(f"✅ Admin user '{ADMIN_USERNAME}' already exists")
        # Update password if needed
        admin_user.set_password(ADMIN_PASSWORD)
        admin_user.is_active = True
        admin_user.admin_role = 'super_admin'
        admin_user.save()
        print(f"✅ Password updated for admin user")
    else:
        # Create new admin user
        admin_user = AdminUser.objects.create(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            first_name=ADMIN_FIRST_NAME,
            last_name=ADMIN_LAST_NAME,
            admin_role='super_admin',
            department='IT',
            can_send_notifications=True,
            can_manage_users=True,
            can_view_analytics=True,
            can_manage_system=True,
            is_active=True
        )
        admin_user.set_password(ADMIN_PASSWORD)
        admin_user.save()
        print(f"✅ Created admin user: {ADMIN_USERNAME}")
    
    print(f"\n📋 Admin User Details:")
    print(f"   Username: {admin_user.username}")
    print(f"   Email: {admin_user.email}")
    print(f"   Role: {admin_user.admin_role}")
    print(f"   Department: {admin_user.department}")
    print(f"   Active: {admin_user.is_active}")
    print(f"\n🔐 Login Credentials:")
    print(f"   Username: {ADMIN_USERNAME}")
    print(f"   Password: {ADMIN_PASSWORD}")
    print(f"\n⚠️  IMPORTANT: Change the password after first login!")
    
except Exception as e:
    print(f"❌ Error creating admin user: {str(e)}")
    import traceback
    traceback.print_exc()