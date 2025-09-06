#!/usr/bin/env python
"""
Script to update business name for a specific user
Usage: python update_business_name.py
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User
from users.models import Business

def update_business_name():
    """Update business name from Juba Cargo Village to Zooom Store"""
    
    email = "jubacargovillage@outlook.com"
    old_name = "Juba Cargo Village"
    new_name = "Zooom Store"
    
    try:
        # Find the user
        user = User.objects.get(email=email)
        print(f"✅ Found user: {user.email} (ID: {user.id})")
        
        # Find the business associated with this user
        # The Business model uses owner_id which is stored as UUID but references User.id
        businesses = Business.objects.filter(owner_id=str(user.id))
        
        if not businesses.exists():
            print(f"❌ No business found for user {email}")
            return False
        
        business = businesses.first()
        print(f"✅ Found business: {business.name} (ID: {business.id})")
        
        if business.name != old_name:
            print(f"⚠️ Business name is '{business.name}', not '{old_name}'")
            response = input("Do you want to update it anyway? (yes/no): ")
            if response.lower() != 'yes':
                print("Aborted.")
                return False
        
        # Update the business name
        with transaction.atomic():
            business.name = new_name
            business.save()
            print(f"✅ Successfully updated business name from '{old_name}' to '{new_name}'")
            
            # Verify the update
            business.refresh_from_db()
            print(f"✅ Verified: Business name is now '{business.name}'")
            
        return True
        
    except User.DoesNotExist:
        print(f"❌ User with email {email} not found")
        return False
    except Exception as e:
        print(f"❌ Error updating business name: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = update_business_name()
    sys.exit(0 if success else 1)