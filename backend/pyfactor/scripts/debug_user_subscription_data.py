#!/usr/bin/env python
"""
Debug script to check user subscription plan and name data
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from django.db import connection

def debug_user_data():
    """Check what subscription and name data we have for users."""
    
    print("=" * 80)
    print("DEBUG: User Subscription and Name Data")
    print("=" * 80)
    
    # Find users who have completed onboarding
    users = User.objects.filter(onboarding_completed=True).order_by('-updated_at')[:10]
    
    print(f"\nFound {users.count()} users with completed onboarding (showing latest 10):\n")
    
    for user in users:
        print(f"Email: {user.email}")
        print(f"  - subscription_plan: '{user.subscription_plan}'")
        print(f"  - first_name: '{user.first_name}'")
        print(f"  - last_name: '{user.last_name}'")
        print(f"  - given_name: '{getattr(user, 'given_name', 'N/A')}'")
        print(f"  - family_name: '{getattr(user, 'family_name', 'N/A')}'")
        print(f"  - name: '{user.name}'")
        print(f"  - tenant_id: {user.tenant_id}")
        print(f"  - onboarding_completed: {user.onboarding_completed}")
        print(f"  - updated_at: {user.updated_at}")
        print("-" * 40)
    
    # Check if we have any users with subscription plans other than free
    paid_users = User.objects.exclude(subscription_plan__in=['', None, 'free']).count()
    print(f"\nUsers with paid subscriptions: {paid_users}")
    
    # Check most recent user sessions
    print("\n" + "=" * 80)
    print("Checking User Sessions:")
    print("=" * 80)
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT u.email, u.subscription_plan, u.first_name, u.last_name, 
                   s.needs_onboarding, s.created_at
            FROM user_sessions_usersession s
            JOIN custom_auth_user u ON s.user_id = u.id
            WHERE s.is_active = true
            ORDER BY s.created_at DESC
            LIMIT 5
        """)
        
        sessions = cursor.fetchall()
        if sessions:
            print("\nActive sessions (latest 5):")
            for session in sessions:
                email, plan, fname, lname, needs_onb, created = session
                print(f"  {email}: plan='{plan}', name='{fname} {lname}', needs_onboarding={needs_onb}")
        else:
            print("\nNo active sessions found")

if __name__ == '__main__':
    debug_user_data()