#!/usr/bin/env python
"""
Script to create an admin user for the admin portal
Usage: python manage.py shell < scripts/create_admin_user.py
"""

import sys
import getpass
from django.db import transaction as db_transaction
from notifications.models import AdminUser
from django.contrib.auth.hashers import make_password

print("🎯 === CREATE ADMIN USER ===")

# Check if any admin users exist
existing_admins = AdminUser.objects.all()
if existing_admins.exists():
    print(f"\n📋 Existing admin users ({existing_admins.count()}):")
    for admin in existing_admins[:5]:  # Show first 5
        print(f"   - {admin.username} ({admin.email}) - Role: {admin.admin_role}")
    if existing_admins.count() > 5:
        print(f"   ... and {existing_admins.count() - 5} more")

# Get admin details
print("\n📝 Enter details for the new admin user:")

# Username
while True:
    username = input("Username: ").strip()
    if not username:
        print("❌ Username cannot be empty")
        continue
    if AdminUser.objects.filter(username=username).exists():
        print(f"❌ Username '{username}' already exists")
        continue
    break

# Email
while True:
    email = input("Email: ").strip().lower()
    if not email:
        print("❌ Email cannot be empty")
        continue
    if '@' not in email:
        print("❌ Invalid email format")
        continue
    if AdminUser.objects.filter(email=email).exists():
        print(f"❌ Email '{email}' already exists")
        continue
    break

# Password
while True:
    password = getpass.getpass("Password: ")
    if len(password) < 8:
        print("❌ Password must be at least 8 characters")
        continue
    password_confirm = getpass.getpass("Confirm password: ")
    if password != password_confirm:
        print("❌ Passwords do not match")
        continue
    break

# Names
first_name = input("First name (optional): ").strip()
last_name = input("Last name (optional): ").strip()

# Admin role
print("\n📋 Available admin roles:")
print("   1. super_admin - Full access to everything")
print("   2. admin - Can manage users and notifications")
print("   3. moderator - Can moderate content and view reports")
print("   4. support_agent - Can view users and send support messages")
print("   5. read_only - View only access")

role_map = {
    '1': 'super_admin',
    '2': 'admin',
    '3': 'moderator',
    '4': 'support_agent',
    '5': 'read_only'
}

while True:
    role_choice = input("\nSelect role (1-5): ").strip()
    if role_choice in role_map:
        admin_role = role_map[role_choice]
        break
    print("❌ Invalid choice. Please enter 1-5")

# Department
print("\n📋 Available departments:")
departments = [
    ('support', 'Customer Support'),
    ('product', 'Product Team'),
    ('engineering', 'Engineering'),
    ('sales', 'Sales'),
    ('management', 'Management'),
    ('finance', 'Finance'),
]

for i, (code, name) in enumerate(departments, 1):
    print(f"   {i}. {name}")

while True:
    dept_choice = input("\nSelect department (1-6): ").strip()
    try:
        dept_index = int(dept_choice) - 1
        if 0 <= dept_index < len(departments):
            department = departments[dept_index][0]
            break
    except ValueError:
        pass
    print("❌ Invalid choice. Please enter 1-6")

# Create the admin user
print("\n🔄 Creating admin user...")
try:
    with db_transaction.atomic():
        admin_user = AdminUser(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            admin_role=admin_role,
            department=department,
            is_active=True,
        )
        
        # Set password
        admin_user.set_password(password)
        
        # Set permissions based on role
        if admin_role in ['super_admin', 'admin']:
            admin_user.can_send_notifications = True
            admin_user.can_view_all_users = True
            admin_user.can_moderate_content = True
        elif admin_role == 'moderator':
            admin_user.can_moderate_content = True
            admin_user.can_view_feedback = True
        elif admin_role == 'support_agent':
            admin_user.can_send_notifications = True
            admin_user.can_view_feedback = True
        
        admin_user.save()
        
        print("\n✅ Admin user created successfully!")
        print(f"\n📋 Admin User Details:")
        print(f"   Username: {admin_user.username}")
        print(f"   Email: {admin_user.email}")
        print(f"   Name: {admin_user.get_full_name() or 'N/A'}")
        print(f"   Role: {admin_user.admin_role}")
        print(f"   Department: {admin_user.department}")
        print(f"   Can send notifications: {admin_user.can_send_notifications}")
        print(f"   Can view all users: {admin_user.can_view_all_users}")
        print(f"   Can moderate content: {admin_user.can_moderate_content}")
        
        print("\n🚀 You can now log in to the admin portal at /admin")
        
except Exception as e:
    print(f"\n❌ Error creating admin user: {e}")
    print("\n💡 Tips:")
    print("   - Make sure you've run the migrations first")
    print("   - Check that the database connection is working")
    print("   - Try running: python manage.py migrate notifications")
    sys.exit(1)