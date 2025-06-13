#!/usr/bin/env python
"""
Execute the delete_all_users_and_data.sql script using Django's database connection.
This script provides a safe way to delete all user data with confirmation prompts.

Usage:
    python manage.py shell < scripts/execute_delete_all_users.py
    OR
    python scripts/execute_delete_all_users.py (if Django settings are configured)
"""

import os
import sys
import django
from django.db import connection, transaction
from django.core.management import call_command

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def confirm_deletion():
    """Ask for user confirmation before proceeding with deletion."""
    print("\n" + "="*80)
    print("WARNING: This will DELETE ALL USERS AND ASSOCIATED DATA!")
    print("="*80)
    print("\nThis action will delete:")
    print("- All users from custom_auth_user")
    print("- All tenants from custom_auth_tenant")
    print("- All businesses and business details")
    print("- All user profiles and onboarding progress")
    print("- All related data (finance, reports, etc.)")
    print("\nThis action is IRREVERSIBLE!")
    print("="*80)
    
    response = input("\nAre you ABSOLUTELY sure you want to proceed? Type 'DELETE ALL USERS' to confirm: ")
    return response == "DELETE ALL USERS"

def execute_deletion():
    """Execute the deletion SQL script."""
    try:
        with connection.cursor() as cursor:
            # First, let's check current user count
            cursor.execute("SELECT COUNT(*) FROM custom_auth_user")
            user_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM custom_auth_tenant")
            tenant_count = cursor.fetchone()[0]
            
            print(f"\nCurrent database state:")
            print(f"- Users: {user_count}")
            print(f"- Tenants: {tenant_count}")
            
            if user_count == 0 and tenant_count == 0:
                print("\nNo users or tenants found. Database is already clean.")
                return
            
            # Use a transaction for safety
            with transaction.atomic():
                print("\nStarting deletion process...")
                
                # Delete in correct order to avoid FK constraint violations
                tables_to_clear = [
                    # Finance and reports
                    ("finance_transaction", "finance transactions"),
                    ("finance_journalentry", "journal entries"),
                    ("finance_account", "finance accounts"),
                    ("reports_report", "reports"),
                    
                    # HR/Payroll (if exist)
                    ("hr_employee", "employees", True),
                    ("payroll_payroll", "payroll records", True),
                    
                    # Inventory/Sales/Purchases (if exist)
                    ("inventory_item", "inventory items", True),
                    ("sales_invoice", "invoices", True),
                    ("purchases_bill", "bills", True),
                    
                    # Banking (if exist)
                    ("banking_banktransaction", "bank transactions", True),
                    ("banking_bankaccount", "bank accounts", True),
                    
                    # CRM (if exist)
                    ("crm_customer", "customers", True),
                    ("crm_vendor", "vendors", True),
                    
                    # User-related tables
                    ("users_menu_privilege", "menu privileges"),
                    ("users_businessmember", "business members"),
                    ("users_subscription", "subscriptions"),
                    ("users_business_details", "business details"),
                    ("onboarding_onboardingprogress", "onboarding progress"),
                    ("users_userprofile", "user profiles"),
                    ("onboarding_userprofile", "onboarding profiles", True),
                    ("users_business", "businesses"),
                    ("custom_auth_account_deletion_log", "deletion logs"),
                    
                    # Core tables
                    ("custom_auth_user", "users"),
                    ("custom_auth_tenant", "tenants"),
                ]
                
                for table_info in tables_to_clear:
                    table_name = table_info[0]
                    description = table_info[1]
                    optional = len(table_info) > 2 and table_info[2]
                    
                    try:
                        # Check if table exists
                        cursor.execute("""
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_name = %s
                            )
                        """, [table_name])
                        
                        if cursor.fetchone()[0]:
                            cursor.execute(f"DELETE FROM {table_name}")
                            deleted_count = cursor.rowcount
                            if deleted_count > 0:
                                print(f"  ✓ Deleted {deleted_count} {description}")
                        elif not optional:
                            print(f"  ⚠ Table {table_name} not found")
                    except Exception as e:
                        if not optional:
                            print(f"  ✗ Error deleting from {table_name}: {str(e)}")
                
                # Reset sequences
                print("\nResetting sequences...")
                cursor.execute("""
                    SELECT sequence_name 
                    FROM information_schema.sequences 
                    WHERE sequence_name LIKE 'custom_auth_%_seq'
                """)
                sequences = cursor.fetchall()
                
                for (seq_name,) in sequences:
                    cursor.execute(f"ALTER SEQUENCE {seq_name} RESTART WITH 1")
                    print(f"  ✓ Reset sequence {seq_name}")
                
                # Final verification
                cursor.execute("SELECT COUNT(*) FROM custom_auth_user")
                final_user_count = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM custom_auth_tenant")
                final_tenant_count = cursor.fetchone()[0]
                
                print(f"\nFinal database state:")
                print(f"- Users: {final_user_count}")
                print(f"- Tenants: {final_tenant_count}")
                
                if final_user_count == 0 and final_tenant_count == 0:
                    print("\n✅ All user data successfully deleted!")
                    
                    # Ask for final confirmation before committing
                    commit_response = input("\nCommit these changes? (yes/no): ")
                    if commit_response.lower() == 'yes':
                        print("Changes committed successfully!")
                        return True
                    else:
                        raise Exception("User cancelled commit")
                else:
                    raise Exception("Deletion incomplete - some data remains")
                    
    except Exception as e:
        print(f"\n❌ Error during deletion: {str(e)}")
        print("Transaction rolled back - no changes were made.")
        return False

def main():
    """Main execution function."""
    print("Delete All Users Script")
    print("=" * 80)
    
    if not confirm_deletion():
        print("\nDeletion cancelled by user.")
        return
    
    success = execute_deletion()
    
    if success:
        print("\n" + "="*80)
        print("✅ DELETION COMPLETE")
        print("All users and associated data have been removed from the database.")
        print("="*80)
    else:
        print("\n" + "="*80)
        print("❌ DELETION FAILED OR CANCELLED")
        print("No changes were made to the database.")
        print("="*80)

if __name__ == "__main__":
    main()