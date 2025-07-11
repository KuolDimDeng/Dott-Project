#!/usr/bin/env python
"""
Fix kdeng@dottapps.com role to OWNER
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User

try:
    user = User.objects.get(email='kdeng@dottapps.com')
    print(f"Current role: {user.role}")
    user.role = 'OWNER'
    user.save()
    print(f"Updated role to: {user.role}")
    print("Success!")
except User.DoesNotExist:
    print("User kdeng@dottapps.com not found")
except Exception as e:
    print(f"Error: {e}")