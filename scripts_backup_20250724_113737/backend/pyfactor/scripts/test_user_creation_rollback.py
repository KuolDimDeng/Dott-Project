#!/usr/bin/env python
"""
Test script to verify user creation rollback on Auth0 failure
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from django.db import transaction

def test_transaction_rollback():
    """Test that user creation is properly rolled back on failure"""
    print("\n" + "="*50)
    print("Testing User Creation Transaction Rollback")
    print("="*50 + "\n")
    
    # Count users before test
    initial_count = User.objects.count()
    print(f"Initial user count: {initial_count}")
    
    test_email = "test_rollback@example.com"
    
    # First, make sure the test user doesn't exist
    User.objects.filter(email=test_email).delete()
    
    try:
        # Simulate a user creation that will fail
        with transaction.atomic():
            print(f"\nCreating user: {test_email}")
            user = User.objects.create(
                email=test_email,
                role='USER',
                is_active=True,
                auth0_sub=f"pending_{test_email}"
            )
            print(f"User created with ID: {user.id}")
            
            # Simulate an Auth0 failure
            print("\nSimulating Auth0 failure...")
            raise Exception("Simulated Auth0 failure")
            
    except Exception as e:
        print(f"\nCaught exception: {str(e)}")
        print("Transaction should have been rolled back")
    
    # Check if user was rolled back
    after_count = User.objects.count()
    user_exists = User.objects.filter(email=test_email).exists()
    
    print(f"\nUser count after rollback: {after_count}")
    print(f"Test user exists: {user_exists}")
    
    if after_count == initial_count and not user_exists:
        print("\n✅ SUCCESS: Transaction rollback worked correctly!")
    else:
        print("\n❌ FAILURE: Transaction rollback did not work properly!")
        if user_exists:
            print(f"   User {test_email} still exists in database")
            # Clean up
            User.objects.filter(email=test_email).delete()

def check_database_state():
    """Check for any orphaned users without auth0_sub"""
    print("\n" + "-"*50)
    print("Checking for orphaned users")
    print("-"*50)
    
    orphaned_users = User.objects.filter(auth0_sub__startswith='pending_')
    print(f"\nFound {orphaned_users.count()} users with pending Auth0 IDs:")
    
    for user in orphaned_users[:10]:  # Show first 10
        print(f"  - {user.email} (ID: {user.id}, Created: {user.created_at})")
    
    if orphaned_users.count() > 10:
        print(f"  ... and {orphaned_users.count() - 10} more")

if __name__ == "__main__":
    test_transaction_rollback()
    check_database_state()