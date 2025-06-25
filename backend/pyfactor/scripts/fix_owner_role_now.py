#!/usr/bin/env python
"""
Quick script to fix kdeng@dottapps.com role to OWNER
Run this on the backend server to fix the role issue
"""
from custom_auth.models import User

# Find and update kdeng@dottapps.com
user = User.objects.filter(email='kdeng@dottapps.com').first()

if user:
    print(f"Found user: {user.email}")
    print(f"Current role: {user.role}")
    
    # Update to OWNER role
    user.role = 'OWNER'
    user.save()
    
    print(f"Updated role to: {user.role}")
    
    # Clear sessions to force re-login
    from django.contrib.sessions.models import Session
    sessions_deleted = Session.objects.all().delete()
    print(f"Cleared {sessions_deleted[0]} sessions")
else:
    print("User kdeng@dottapps.com not found!")