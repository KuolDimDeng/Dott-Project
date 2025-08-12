#!/usr/bin/env python
"""
Script to populate user names from existing data
Run: python manage.py shell < scripts/populate_user_names.py
"""

from custom_auth.models import User
from django.db import transaction as db_transaction

print("Populating user names from existing data...")

with db_transaction.atomic():
    users_updated = 0
    
    for user in User.objects.all():
        updated = False
        
        # If user has a name field but no first/last name, try to parse it
        if user.name and (not user.first_name or not user.last_name):
            name_parts = user.name.strip().split(' ', 1)
            if name_parts:
                if not user.first_name:
                    user.first_name = name_parts[0]
                    updated = True
                if len(name_parts) > 1 and not user.last_name:
                    user.last_name = name_parts[1]
                    updated = True
        
        # Set given_name and family_name from first_name and last_name
        if hasattr(user, 'given_name'):
            if user.first_name and not user.given_name:
                user.given_name = user.first_name
                updated = True
        
        if hasattr(user, 'family_name'):
            if user.last_name and not user.family_name:
                user.family_name = user.last_name
                updated = True
        
        # Set nickname from email if not set
        if hasattr(user, 'nickname') and not user.nickname:
            user.nickname = user.email.split('@')[0]
            updated = True
        
        if updated:
            user.save()
            users_updated += 1
            print(f"Updated user: {user.email}")

print(f"\nDone! Updated {users_updated} users.")