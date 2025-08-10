#!/usr/bin/env python
"""
Simple script to check if a user exists
"""

import os
import sys
import django

# Setup Django
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
email = "kuoldimdeng@outlook.com"

try:
    user = User.objects.filter(email=email).first()
    
    if user:
        print(f"❌ USER EXISTS: {email}")
        print(f"  - User ID: {user.id}")
        print(f"  - Username: {user.username}")
        print(f"  - Date joined: {user.date_joined}")
        print(f"  - Is active: {user.is_active}")
        print(f"  - Tenant ID: {getattr(user, 'tenant_id', 'None')}")
        
        # Delete the user
        response = input(f"\nDelete user {email}? (yes/no): ")
        if response.lower() == 'yes':
            user.delete()
            print(f"✅ User {email} has been deleted")
        else:
            print(f"User {email} was NOT deleted")
    else:
        print(f"✅ USER DOES NOT EXIST: {email}")
        print("No action needed - this user is not in your database")
        
except Exception as e:
    print(f"Error checking user: {str(e)}")