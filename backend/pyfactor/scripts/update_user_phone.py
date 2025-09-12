#!/usr/bin/env python3
"""
Script to update phone number for a specific user
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.contrib.auth.models import User

def update_user_phone(email, new_phone):
    """Update phone number for user with given email"""
    try:
        user = User.objects.get(email=email)
        print(f"Found user: {user.email}")
        print(f"Current phone: {getattr(user, 'phone_number', 'Not set')}")
        
        # Update phone number
        user.phone_number = new_phone
        user.save()
        print(f"Updated phone to: {new_phone}")
        
        # Also update in UserProfile if it exists
        if hasattr(user, 'profile'):
            user.profile.phone_number = new_phone
            user.profile.save()
            print(f"Also updated UserProfile phone to: {new_phone}")
        
        return True
        
    except User.DoesNotExist:
        print(f"User with email {email} not found")
        return False
    except Exception as e:
        print(f"Error updating phone: {str(e)}")
        return False

if __name__ == "__main__":
    email = "support@dottapps.com"
    new_phone = "+211925550100"
    
    print(f"Updating phone number for {email} to {new_phone}")
    success = update_user_phone(email, new_phone)
    
    if success:
        print("✅ Phone number updated successfully!")
    else:
        print("❌ Failed to update phone number")