#!/usr/bin/env python
"""
Check user attributes to understand what data we have
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import User

def check_user(email):
    """Check user attributes"""
    try:
        user = User.objects.get(email=email)
        print(f"\nUser: {user.email}")
        print(f"ID: {user.id}")
        print(f"First Name: {user.first_name}")
        print(f"Last Name: {user.last_name}")
        print(f"Full Name: {user.name if hasattr(user, 'name') else 'N/A'}")
        
        print("\nAll non-private attributes:")
        for attr in dir(user):
            if not attr.startswith('_') and not callable(getattr(user, attr, None)):
                try:
                    value = getattr(user, attr)
                    if not isinstance(value, type) and str(value) != str(type(value)):
                        print(f"  {attr}: {value}")
                except Exception as e:
                    print(f"  {attr}: <error reading: {e}>")
        
    except User.DoesNotExist:
        print(f"User {email} not found")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_user_attributes.py <email>")
        sys.exit(1)
    
    check_user(sys.argv[1])