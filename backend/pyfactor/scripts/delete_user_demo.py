#!/usr/bin/env python3
"""
User Deletion Demo Script
Demonstrates the usage of the comprehensive user deletion system

This script shows how to:
1. Analyze user relationships
2. Soft delete users
3. Hard delete users
4. Restore soft-deleted users
5. Check deletion status
"""

import os
import sys
import django

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from comprehensive_user_deletion import UserDeletionManager
from quick_user_soft_delete import soft_delete_user, restore_user, list_deleted_users, check_user_status
from user_deletion_with_auth0 import delete_user_complete, check_auth0_user


def demo_user_deletion():
    """Demonstrate the user deletion system"""
    print("=" * 80)
    print("USER DELETION SYSTEM DEMO")
    print("=" * 80)
    
    while True:
        print("\n📋 Available Actions:")
        print("1. Analyze user relationships")
        print("2. Soft delete user (recoverable)")
        print("3. Hard delete user (permanent)")
        print("4. Delete from both DB and Auth0")
        print("5. Restore soft-deleted user")
        print("6. List all soft-deleted users")
        print("7. Check user status")
        print("8. Check Auth0 status")
        print("9. Exit")
        
        choice = input("\nSelect an action (1-9): ")
        
        if choice == '1':
            # Analyze user relationships
            email = input("Enter user email: ")
            try:
                from custom_auth.models import User
                user = User.objects.get(email=email)
                manager = UserDeletionManager()
                manager.analyze_user_relationships(user)
            except User.DoesNotExist:
                print(f"❌ User not found: {email}")
            except Exception as e:
                print(f"❌ Error: {str(e)}")
        
        elif choice == '2':
            # Soft delete
            email = input("Enter user email: ")
            reason = input("Reason for deletion (optional): ") or "User requested account closure"
            if soft_delete_user(email, reason):
                print(f"✅ User {email} soft deleted successfully")
            else:
                print(f"❌ Failed to soft delete user {email}")
        
        elif choice == '3':
            # Hard delete
            email = input("Enter user email: ")
            try:
                from custom_auth.models import User
                user = User.objects.get(email=email)
                manager = UserDeletionManager()
                reason = input("Reason for deletion (optional): ") or "Permanent deletion requested"
                if manager.hard_delete_user(user, reason):
                    print(f"✅ User {email} permanently deleted")
                else:
                    print(f"❌ Failed to delete user {email}")
            except User.DoesNotExist:
                print(f"❌ User not found: {email}")
            except Exception as e:
                print(f"❌ Error: {str(e)}")
        
        elif choice == '4':
            # Delete from both DB and Auth0
            email = input("Enter user email: ")
            hard = input("Hard delete? (y/n): ").lower() == 'y'
            if delete_user_complete(email, delete_from_auth0=True, hard_delete=hard):
                print(f"✅ User {email} deleted from both DB and Auth0")
            else:
                print(f"❌ Failed to delete user {email}")
        
        elif choice == '5':
            # Restore user
            email = input("Enter user email: ")
            if restore_user(email):
                print(f"✅ User {email} restored successfully")
            else:
                print(f"❌ Failed to restore user {email}")
        
        elif choice == '6':
            # List deleted users
            list_deleted_users()
        
        elif choice == '7':
            # Check user status
            email = input("Enter user email: ")
            check_user_status(email)
        
        elif choice == '8':
            # Check Auth0 status
            email = input("Enter user email: ")
            check_auth0_user(email)
        
        elif choice == '9':
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please select 1-9.")


if __name__ == "__main__":
    demo_user_deletion()