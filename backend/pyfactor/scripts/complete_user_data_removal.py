#!/usr/bin/env python
"""
Complete User Data Removal Script
Run this script in Render shell to completely remove all user-related data from the database.

DANGER: This script will permanently delete ALL user data including:
- User accounts and authentication data
- Tenants and business information
- Financial data (invoices, expenses, transactions)
- Inventory and customer data
- All related records

Usage:
    python scripts/complete_user_data_removal.py [--confirm] [--email=user@example.com]

Options:
    --confirm: Skip confirmation prompts (use with caution!)
    --email=EMAIL: Remove data for a specific user only (safer option)

Example:
    # Remove all users (requires confirmation)
    python scripts/complete_user_data_removal.py
    
    # Remove specific user
    python scripts/complete_user_data_removal.py --email=user@example.com
    
    # Remove all users without confirmation (DANGEROUS!)
    python scripts/complete_user_data_removal.py --confirm
"""

import os
import sys
import django
from django.db import connection, transaction
from django.core.management.base import CommandError
import argparse
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def get_user_count():
    """Get total number of users in the database"""
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM auth_customuser")
        return cursor.fetchone()[0]

def get_tenant_count():
    """Get total number of tenants in the database"""
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM auth_tenant")
        return cursor.fetchone()[0]

def remove_specific_user(email):
    """Remove data for a specific user by email"""
    sql_script = """
    -- Complete User Data Removal for specific user
    -- Email: {email}
    -- Timestamp: {timestamp}
    
    BEGIN;
    
    -- Get user ID
    DO $$
    DECLARE
        target_user_id VARCHAR(255);
        target_tenant_id UUID;
    BEGIN
        -- Find user by email
        SELECT id INTO target_user_id FROM auth_customuser WHERE email = '{email}';
        
        IF target_user_id IS NULL THEN
            RAISE NOTICE 'User with email {email} not found';
            RETURN;
        END IF;
        
        RAISE NOTICE 'Found user % with email {email}', target_user_id;
        
        -- Find user's tenant
        SELECT id INTO target_tenant_id FROM auth_tenant WHERE owner_id = target_user_id;
        
        IF target_tenant_id IS NOT NULL THEN
            RAISE NOTICE 'Found tenant % for user', target_tenant_id;
            
            -- Delete financial data
            DELETE FROM accounting_invoice WHERE tenant_id = target_tenant_id;
            DELETE FROM accounting_expense WHERE tenant_id = target_tenant_id;
            DELETE FROM accounting_incomestatement WHERE tenant_id = target_tenant_id;
            DELETE FROM accounting_transaction WHERE tenant_id = target_tenant_id;
            DELETE FROM accounting_bankaccount WHERE tenant_id = target_tenant_id;
            DELETE FROM accounting_budgetcategory WHERE tenant_id = target_tenant_id;
            DELETE FROM accounting_recurringexpense WHERE tenant_id = target_tenant_id;
            DELETE FROM accounting_financial_summary WHERE tenant_id = target_tenant_id;
            
            -- Delete inventory data
            DELETE FROM inventory_inventoryitem WHERE tenant_id = target_tenant_id;
            DELETE FROM inventory_inventorycategory WHERE tenant_id = target_tenant_id;
            DELETE FROM inventory_inventorytransaction WHERE tenant_id = target_tenant_id;
            DELETE FROM inventory_supplier WHERE tenant_id = target_tenant_id;
            DELETE FROM inventory_purchaseorder WHERE tenant_id = target_tenant_id;
            DELETE FROM inventory_salesorder WHERE tenant_id = target_tenant_id;
            
            -- Delete customer data
            DELETE FROM accounting_customer WHERE tenant_id = target_tenant_id;
            DELETE FROM accounting_payment WHERE tenant_id = target_tenant_id;
            
            -- Delete integrations
            DELETE FROM integrations_shopifyintegration WHERE tenant_id = target_tenant_id;
            
            -- Delete AI assistance data
            DELETE FROM ai_assistance_aiquery WHERE tenant_id = target_tenant_id;
            DELETE FROM ai_assistance_aisession WHERE tenant_id = target_tenant_id;
            DELETE FROM ai_assistance_tenantaiusage WHERE tenant_id = target_tenant_id;
            
            -- Delete documents
            DELETE FROM documents_document WHERE tenant_id = target_tenant_id;
            
            -- Delete tenant permissions
            DELETE FROM auth_tenantpermission WHERE tenant_id = target_tenant_id;
            
            -- Delete the tenant
            DELETE FROM auth_tenant WHERE id = target_tenant_id;
        END IF;
        
        -- Delete user session data
        DELETE FROM session_manager_usersession WHERE user_id = target_user_id;
        DELETE FROM session_manager_sessionevent WHERE session_id IN (
            SELECT session_id FROM session_manager_usersession WHERE user_id = target_user_id
        );
        
        -- Delete user profile and onboarding data
        DELETE FROM users_userprofile WHERE owner_id = target_user_id;
        DELETE FROM onboarding_onboardingprogress WHERE user_id = target_user_id;
        DELETE FROM users_subscription WHERE user_id = target_user_id;
        DELETE FROM users_stripesubscription WHERE user_id = target_user_id;
        
        -- Finally delete the user
        DELETE FROM auth_customuser WHERE id = target_user_id;
        
        RAISE NOTICE 'Successfully removed all data for user {email}';
    END $$;
    
    COMMIT;
    """
    
    return sql_script.format(email=email, timestamp=datetime.now().isoformat())

def remove_all_users():
    """Generate SQL script to remove ALL user data"""
    sql_script = """
    -- Complete User Data Removal Script
    -- WARNING: This will DELETE ALL user data!
    -- Timestamp: {timestamp}
    
    BEGIN;
    
    -- Disable triggers temporarily for faster deletion
    SET session_replication_role = 'replica';
    
    -- Delete all financial data
    TRUNCATE TABLE accounting_invoice CASCADE;
    TRUNCATE TABLE accounting_expense CASCADE;
    TRUNCATE TABLE accounting_incomestatement CASCADE;
    TRUNCATE TABLE accounting_transaction CASCADE;
    TRUNCATE TABLE accounting_bankaccount CASCADE;
    TRUNCATE TABLE accounting_budgetcategory CASCADE;
    TRUNCATE TABLE accounting_recurringexpense CASCADE;
    TRUNCATE TABLE accounting_financial_summary CASCADE;
    
    -- Delete all inventory data
    TRUNCATE TABLE inventory_inventoryitem CASCADE;
    TRUNCATE TABLE inventory_inventorycategory CASCADE;
    TRUNCATE TABLE inventory_inventorytransaction CASCADE;
    TRUNCATE TABLE inventory_supplier CASCADE;
    TRUNCATE TABLE inventory_purchaseorder CASCADE;
    TRUNCATE TABLE inventory_salesorder CASCADE;
    
    -- Delete all customer and payment data
    TRUNCATE TABLE accounting_customer CASCADE;
    TRUNCATE TABLE accounting_payment CASCADE;
    
    -- Delete all integration data
    TRUNCATE TABLE integrations_shopifyintegration CASCADE;
    
    -- Delete all AI assistance data
    TRUNCATE TABLE ai_assistance_aiquery CASCADE;
    TRUNCATE TABLE ai_assistance_aisession CASCADE;
    TRUNCATE TABLE ai_assistance_tenantaiusage CASCADE;
    
    -- Delete all documents
    TRUNCATE TABLE documents_document CASCADE;
    
    -- Delete all session data
    TRUNCATE TABLE session_manager_sessionevent CASCADE;
    TRUNCATE TABLE session_manager_usersession CASCADE;
    
    -- Delete all user profile and subscription data
    TRUNCATE TABLE users_userprofile CASCADE;
    TRUNCATE TABLE users_subscription CASCADE;
    TRUNCATE TABLE users_stripesubscription CASCADE;
    
    -- Delete all onboarding data
    TRUNCATE TABLE onboarding_onboardingprogress CASCADE;
    
    -- Delete all tenant permissions
    TRUNCATE TABLE auth_tenantpermission CASCADE;
    
    -- Delete all tenants
    TRUNCATE TABLE auth_tenant CASCADE;
    
    -- Delete all users (this should be last)
    TRUNCATE TABLE auth_customuser CASCADE;
    
    -- Re-enable triggers
    SET session_replication_role = 'origin';
    
    -- Reset sequences
    ALTER SEQUENCE IF EXISTS accounting_invoice_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS accounting_expense_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS inventory_inventoryitem_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS accounting_customer_id_seq RESTART WITH 1;
    
    COMMIT;
    
    -- Vacuum analyze to reclaim space
    VACUUM ANALYZE;
    """
    
    return sql_script.format(timestamp=datetime.now().isoformat())

def execute_sql(sql_script, description="data removal"):
    """Execute SQL script with error handling"""
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(sql_script)
                print(f"✅ Successfully completed {description}")
                return True
    except Exception as e:
        print(f"❌ Error during {description}: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Remove user data from the database')
    parser.add_argument('--confirm', action='store_true', help='Skip confirmation prompts')
    parser.add_argument('--email', type=str, help='Remove data for specific user email only')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("COMPLETE USER DATA REMOVAL SCRIPT")
    print("=" * 60)
    print()
    
    # Check if removing specific user or all users
    if args.email:
        print(f"🎯 Target: Remove data for user: {args.email}")
        
        # Check if user exists
        try:
            from custom_auth.models import CustomUser
            user = CustomUser.objects.filter(email=args.email).first()
            if not user:
                print(f"❌ User with email '{args.email}' not found")
                return
            
            print(f"✅ Found user: {user.email} (ID: {user.id})")
            
            # Check for tenant
            from custom_auth.models import Tenant
            tenant = Tenant.objects.filter(owner_id=str(user.id)).first()
            if tenant:
                print(f"✅ Found tenant: {tenant.name} (ID: {tenant.id})")
            else:
                print("ℹ️  No tenant found for this user")
                
        except Exception as e:
            print(f"❌ Error checking user: {str(e)}")
            return
            
    else:
        print("⚠️  WARNING: This will remove ALL user data from the database!")
        print()
        
        # Show current counts
        try:
            user_count = get_user_count()
            tenant_count = get_tenant_count()
            print(f"Current database status:")
            print(f"  - Total users: {user_count}")
            print(f"  - Total tenants: {tenant_count}")
            print()
        except Exception as e:
            print(f"Warning: Could not get counts: {str(e)}")
    
    # Confirmation
    if not args.confirm:
        print("⚠️  This action is IRREVERSIBLE!")
        print("⚠️  All user data, financial records, and business information will be PERMANENTLY DELETED!")
        print()
        
        if args.email:
            confirm = input(f"Type 'DELETE {args.email}' to confirm removal of this user: ")
            if confirm != f"DELETE {args.email}":
                print("❌ Confirmation failed. Operation cancelled.")
                return
        else:
            confirm = input("Type 'DELETE ALL USERS' to confirm: ")
            if confirm != "DELETE ALL USERS":
                print("❌ Confirmation failed. Operation cancelled.")
                return
    
    print()
    print("🔄 Starting data removal process...")
    print()
    
    # Generate and execute SQL
    if args.email:
        sql_script = remove_specific_user(args.email)
        success = execute_sql(sql_script, f"removal of user {args.email}")
    else:
        sql_script = remove_all_users()
        success = execute_sql(sql_script, "removal of all users")
    
    if success:
        print()
        print("✅ Data removal completed successfully!")
        
        # Show final counts if removed all
        if not args.email:
            try:
                user_count = get_user_count()
                tenant_count = get_tenant_count()
                print(f"\nFinal database status:")
                print(f"  - Total users: {user_count}")
                print(f"  - Total tenants: {tenant_count}")
            except:
                pass
    else:
        print()
        print("❌ Data removal failed. Database has been rolled back.")
        print("   Please check the error messages above.")

if __name__ == "__main__":
    main()