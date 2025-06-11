#!/usr/bin/env python3

"""
Script v0102: Purge All User Data for Fresh Start

Purpose: Clean slate database reset to allow fresh user registration
after deleting users from Auth0

This script will:
1. Delete all OnboardingProgress records
2. Delete all Tenant records  
3. Delete all User records
4. Reset any user-related sequences
5. Provide confirmation of clean state

WARNING: This will delete ALL user data. Make sure you've backed up
anything you want to keep before running this script.
"""

import os
import sys
import django
from datetime import datetime

# Add the backend path to Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend')
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from django.db import transaction, connection
from django.core.management import call_command

User = get_user_model()

def log(message):
    timestamp = datetime.now().isoformat()
    print(f"[{timestamp}] [v0102] {message}")

def confirm_deletion():
    """Get user confirmation before proceeding with deletion"""
    print("\n" + "="*60)
    print("⚠️  WARNING: DATABASE PURGE OPERATION")
    print("="*60)
    print("This script will DELETE ALL of the following data:")
    print("- All User accounts")
    print("- All Tenant records")
    print("- All OnboardingProgress records")
    print("- All related user data")
    print("\nThis action is IRREVERSIBLE!")
    print("="*60)
    
    response = input("\nType 'DELETE ALL DATA' to confirm (anything else will cancel): ")
    
    if response != "DELETE ALL DATA":
        print("Operation cancelled by user.")
        return False
    
    print("\nFinal confirmation...")
    response2 = input("Are you absolutely sure? Type 'YES' to proceed: ")
    
    if response2 != "YES":
        print("Operation cancelled by user.")
        return False
    
    return True

def show_current_counts():
    """Show current record counts before deletion"""
    user_count = User.objects.count()
    tenant_count = Tenant.objects.count()
    progress_count = OnboardingProgress.objects.count()
    
    log(f"Current record counts:")
    log(f"  - Users: {user_count}")
    log(f"  - Tenants: {tenant_count}")  
    log(f"  - OnboardingProgress: {progress_count}")
    
    return user_count, tenant_count, progress_count

def purge_user_data():
    """Purge all user-related data from the database"""
    
    log("Starting database purge operation...")
    
    try:
        with transaction.atomic():
            # 1. Delete OnboardingProgress records first (has foreign keys)
            progress_count = OnboardingProgress.objects.count()
            log(f"Deleting {progress_count} OnboardingProgress records...")
            OnboardingProgress.objects.all().delete()
            log("✅ OnboardingProgress records deleted")
            
            # 2. Delete Tenant records
            tenant_count = Tenant.objects.count()
            log(f"Deleting {tenant_count} Tenant records...")
            Tenant.objects.all().delete()
            log("✅ Tenant records deleted")
            
            # 3. Delete User records (last due to foreign key constraints)
            user_count = User.objects.count()
            log(f"Deleting {user_count} User records...")
            User.objects.all().delete()
            log("✅ User records deleted")
            
            log("✅ All user data purged successfully!")
            
    except Exception as e:
        log(f"❌ Error during purge operation: {str(e)}")
        raise

def reset_sequences():
    """Reset database sequences for clean IDs"""
    try:
        log("Resetting database sequences...")
        
        with connection.cursor() as cursor:
            # Reset user ID sequence if using PostgreSQL
            if connection.vendor == 'postgresql':
                # Get the actual table names
                user_table = User._meta.db_table
                tenant_table = Tenant._meta.db_table
                progress_table = OnboardingProgress._meta.db_table
                
                log(f"Resetting sequence for {user_table}...")
                cursor.execute(f"SELECT setval(pg_get_serial_sequence('{user_table}', 'id'), 1, false);")
                
                # Note: Tenant uses UUID primary keys, so no sequence to reset
                # Note: OnboardingProgress may use auto-incrementing ID
                try:
                    cursor.execute(f"SELECT setval(pg_get_serial_sequence('{progress_table}', 'id'), 1, false);")
                    log(f"Reset sequence for {progress_table}")
                except:
                    log(f"No sequence to reset for {progress_table} (probably uses UUID)")
                
                log("✅ Database sequences reset")
            else:
                log("Not PostgreSQL - skipping sequence reset")
                
    except Exception as e:
        log(f"⚠️  Warning: Could not reset sequences: {str(e)}")
        log("This is not critical - new records will still work")

def verify_clean_state():
    """Verify that all data has been properly deleted"""
    log("Verifying clean state...")
    
    user_count = User.objects.count()
    tenant_count = Tenant.objects.count() 
    progress_count = OnboardingProgress.objects.count()
    
    log(f"Post-purge record counts:")
    log(f"  - Users: {user_count}")
    log(f"  - Tenants: {tenant_count}")
    log(f"  - OnboardingProgress: {progress_count}")
    
    if user_count == 0 and tenant_count == 0 and progress_count == 0:
        log("✅ Database is clean - ready for fresh user registration!")
        return True
    else:
        log("❌ Warning: Some records still exist after purge")
        return False

def main():
    log("Database Purge Script - Fresh Start Preparation")
    log("=" * 50)
    
    # Show current state
    show_current_counts()
    
    # Get user confirmation
    if not confirm_deletion():
        log("Operation cancelled. No data was deleted.")
        return
    
    # Perform the purge
    log("\nStarting purge operation...")
    purge_user_data()
    
    # Reset sequences for clean IDs
    reset_sequences()
    
    # Verify clean state
    if verify_clean_state():
        log("\n✅ SUCCESS: Database purged successfully!")
        log("\nNext steps:")
        log("1. Delete users from Auth0 dashboard")
        log("2. Test fresh user registration")
        log("3. Complete onboarding flow")
        log("4. Verify onboarding persistence works")
    else:
        log("\n❌ Purge incomplete - please check for remaining data")

if __name__ == '__main__':
    main()