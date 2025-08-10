#!/usr/bin/env python
"""
Debug admin login - identify and fix issues
Run this on production: python manage.py shell < debug_admin_login.py
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from notifications.models import AdminUser

print("🔍 Debugging admin login system...")

# 1. Check database table exists
try:
    admin_count = AdminUser.objects.count()
    print(f"   ✅ AdminUser table exists - {admin_count} users found")
except Exception as e:
    print(f"   ❌ AdminUser table error: {e}")
    exit(1)

# 2. List all admin users
if admin_count > 0:
    print("   📋 Admin users:")
    for admin in AdminUser.objects.all():
        print(f"      - {admin.username} ({admin.email})")
        print(f"        Active: {admin.is_active}")
        print(f"        Role: {admin.admin_role}")
        print(f"        Can send notifications: {admin.can_send_notifications}")
        print(f"        Failed login attempts: {admin.failed_login_attempts}")
        print(f"        Account locked: {admin.is_locked}")
        print(f"        Last login: {admin.last_login}")
        print("")
else:
    print("   📝 No admin users found - creating default admin...")
    
    # Create default admin user with known credentials
    admin_user = AdminUser(
        username='dottadmin',
        email='support@dottapps.com',
        first_name='Dott',
        last_name='Support',
        admin_role='super_admin',
        can_send_notifications=True,
        can_view_all_users=True,
        can_view_feedback=True,
        can_moderate_content=True,
        is_active=True
    )
    admin_user.set_password('DottAdmin2025!')
    admin_user.save()
    
    print(f"   ✅ Created admin user:")
    print(f"      Username: {admin_user.username}")
    print(f"      Email: {admin_user.email}")
    print(f"      Password: DottAdmin2025!")
    print(f"      Role: {admin_user.admin_role}")

# 3. Test password hashing
print("   🔐 Testing password functionality...")
test_admin = AdminUser.objects.first()
if test_admin:
    # Test if password checking works
    if test_admin.username == 'dottadmin':
        test_password = 'DottAdmin2025!'
    else:
        test_password = 'admin123'  # Default for old admin user
    
    if test_admin.check_password(test_password):
        print(f"      ✅ Password check working for {test_admin.username}")
    else:
        print(f"      ❌ Password check failed for {test_admin.username}")

print("   🚀 Admin login debug complete!")
print("")
print("🎯 To test admin login:")
print("   1. Go to: https://dottapps.com/admin")
print("   2. Use credentials:")
print("      Username: dottadmin")
print("      Email: support@dottapps.com")  
print("      Password: DottAdmin2025!")
print("")
print("📧 Or try any existing admin users listed above")