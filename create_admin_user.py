#!/usr/bin/env python
"""
Create admin user for production via Django shell
Run this in production: python manage.py shell < create_admin_user.py
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from notifications.models import AdminUser

print("🔧 Creating admin user for production...")

# Check if admin already exists
existing_admin = AdminUser.objects.filter(username='admin').first()
if existing_admin:
    print(f"   Admin user already exists: {existing_admin.username} ({existing_admin.email})")
    print(f"   Active: {existing_admin.is_active}")
    print("   ⚠️  If you can't log in, the password might need to be reset")
else:
    # Create admin user
    admin_user = AdminUser(
        username='admin',
        email='admin@dottapps.com',
        first_name='Dott',
        last_name='Admin',
        admin_role='super_admin',
        can_send_notifications=True,
        can_view_all_users=True,
        can_view_feedback=True,
        can_moderate_content=True,
        is_active=True
    )
    admin_user.set_password('admin123')  # Change this password!
    admin_user.save()
    
    print(f"   ✅ Created admin user:")
    print(f"      Username: {admin_user.username}")
    print(f"      Email: {admin_user.email}")
    print(f"      Password: admin123")
    print(f"      Role: {admin_user.admin_role}")
    print("   ⚠️  IMPORTANT: Change the password after first login!")

print("   Done!")