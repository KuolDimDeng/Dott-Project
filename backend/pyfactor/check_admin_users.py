#!/usr/bin/env python
"""
Check and create admin users for the notification system
"""
import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from notifications.models import AdminUser


def check_admin_users():
    print("🔍 Checking existing admin users...")
    
    # Check if any admin users exist
    admin_count = AdminUser.objects.count()
    print(f"   Total admin users: {admin_count}")
    
    if admin_count > 0:
        print("   Existing admin users:")
        for admin in AdminUser.objects.all():
            print(f"   - {admin.username} ({admin.email}) - Role: {admin.admin_role} - Active: {admin.is_active}")
    else:
        print("   No admin users found!")
        
        # Create a default admin user
        print("🔧 Creating default admin user...")
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
        print(f"      Password: admin123 (CHANGE THIS!)")
        print(f"      Role: {admin_user.admin_role}")


if __name__ == "__main__":
    check_admin_users()