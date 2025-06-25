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
    
    # Update to OWNER
    user.role = 'OWNER'
    user.save()
    
    print(f"✅ Updated role to: {user.role}")
    
    # Clear any cached sessions
    from session_manager.models import UserSession
    UserSession.objects.filter(user=user, is_active=True).update(is_active=False)
    print("✅ Cleared active sessions - user will need to log in again")
else:
    print("❌ User kdeng@dottapps.com not found!")