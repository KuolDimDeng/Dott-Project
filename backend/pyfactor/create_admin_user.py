#!/usr/bin/env python3
"""
Script to create an AdminUser for the notification system admin portal
"""
import os
import sys
import django

# Add the project directory to the path
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from notifications.models import AdminUser

def create_admin_user():
    username = 'admin'
    email = 'kdeng@dottapps.com'
    password = 'admin123'  # You should change this
    
    # Check if admin user already exists
    if AdminUser.objects.filter(username=username).exists():
        print(f"Admin user '{username}' already exists")
        return
    
    # Create admin user
    admin_user = AdminUser.objects.create(
        username=username,
        email=email,
        first_name='Admin',
        last_name='User',
        is_active=True,
        admin_role='super_admin',
        can_send_notifications=True,
        can_view_all_users=True,
        can_view_feedback=True,
        can_moderate_content=True,
        ip_whitelist=[],  # Empty list means no IP restrictions
        department='management'
    )
    
    # Set password
    admin_user.set_password(password)
    admin_user.save()
    
    print(f"✅ Admin user created successfully!")
    print(f"Username: {username}")
    print(f"Email: {email}")
    print(f"Password: {password}")
    print(f"Role: {admin_user.admin_role}")
    print(f"Permissions: send_notifications={admin_user.can_send_notifications}")
    print("\n🔐 Admin Portal Login:")
    print("URL: /admin")
    print(f"Username: {username}")
    print(f"Password: {password}")

if __name__ == '__main__':
    create_admin_user()