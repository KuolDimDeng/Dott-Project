#!/usr/bin/env python3
"""
Interactive User Cleanup Script for Dott Database
Allows deletion of all users or specific users by email
"""

import os
import sys
import psycopg2
from urllib.parse import urlparse
from getpass import getpass

def get_db_connection():
    """Create database connection from DATABASE_URL"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)
    
    try:
        result = urlparse(database_url)
        conn = psycopg2.connect(
            database=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port,
            sslmode='require'
        )
        return conn
    except Exception as e:
        print(f"ERROR: Failed to connect to database: {e}")
        sys.exit(1)

def get_user_count(conn):
    """Get count of users in database"""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM custom_auth_user")
    count = cursor.fetchone()[0]
    cursor.close()
    return count

def list_users(conn):
    """List all users in database"""
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, first_name, last_name FROM custom_auth_user ORDER BY id")
    users = cursor.fetchall()
    cursor.close()
    return users

def delete_specific_user(conn, email):
    """Delete a specific user by email"""
    cursor = conn.cursor()
    
    # First check if user exists
    cursor.execute("SELECT id, email FROM custom_auth_user WHERE email = %s", (email,))
    user = cursor.fetchone()
    
    if not user:
        print(f"❌ User with email '{email}' not found")
        cursor.close()
        return False
    
    user_id, user_email = user
    print(f"\n🎯 Found user: {user_email} (ID: {user_id})")
    
    # Confirm deletion
    confirm = input(f"Are you sure you want to delete this user? (yes/no): ").lower()
    if confirm != 'yes':
        print("❌ Deletion cancelled")
        cursor.close()
        return False
    
    try:
        # Get tenant_id if exists
        cursor.execute("SELECT tenant_id FROM employees WHERE user_id = %s", (user_id,))
        result = cursor.fetchone()
        tenant_id = result[0] if result else None
        
        print("🔍 Starting deletion process...")
        
        # Delete in correct order (same as full cleanup)
        deletion_queries = [
            # Financial records
            ("DELETE FROM accounting_transactions WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM accounting_journal_entries WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM accounting_purchase_receipts WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM accounting_bank_reconciliations WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM accounting_budgets WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM accounting_recurring_transactions WHERE tenant_id = %s", tenant_id),
            
            # Payroll
            ("DELETE FROM payroll_pay_stubs WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM payroll_runs WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM payroll_employee_salaries WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM payroll_deductions WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM payroll_benefits WHERE tenant_id = %s", tenant_id),
            
            # Tax records
            ("DELETE FROM tax_filings WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM tax_payments WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM tax_codes WHERE tenant_id = %s", tenant_id),
            
            # Sales records
            ("DELETE FROM sales_payment_allocations WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM sales_invoice_payments WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM sales_invoice_line_items WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM sales_invoices WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM sales_quotes WHERE tenant_id = %s", tenant_id),
            
            # Purchase records
            ("DELETE FROM purchases_bill_payments WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM purchases_bill_line_items WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM purchases_bills WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM purchases_purchase_orders WHERE tenant_id = %s", tenant_id),
            
            # Inventory
            ("DELETE FROM inventory_stock_adjustments WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM inventory_stock_levels WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM inventory_products WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM inventory_categories WHERE tenant_id = %s", tenant_id),
            
            # Basic records
            ("DELETE FROM accounts WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM customers WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM vendors WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM items WHERE tenant_id = %s", tenant_id),
            
            # HR records
            ("DELETE FROM hr_leave_requests WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM hr_departments WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM hr_positions WHERE tenant_id = %s", tenant_id),
            
            # System records
            ("DELETE FROM notifications WHERE user_id = %s", user_id),
            ("DELETE FROM audit_logs WHERE user_id = %s", user_id),
            ("DELETE FROM user_activities WHERE user_id = %s", user_id),
            ("DELETE FROM api_tokens WHERE user_id = %s", user_id),
            ("DELETE FROM integrations WHERE tenant_id = %s", tenant_id),
            ("DELETE FROM subscription_credits WHERE user_id = %s", user_id),
            
            # Django admin
            ("DELETE FROM django_admin_log WHERE user_id = %s", user_id),
            
            # Core records
            ("DELETE FROM employees WHERE user_id = %s", user_id),
            ("DELETE FROM businesses WHERE owner_id = %s", user_id),
            ("DELETE FROM custom_auth_user WHERE id = %s", user_id)
        ]
        
        # Execute deletions
        for query, param in deletion_queries:
            if param is not None:  # Skip if no tenant_id
                cursor.execute(query, (param,))
        
        conn.commit()
        print(f"✅ Successfully deleted user: {user_email}")
        cursor.close()
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error deleting user: {e}")
        cursor.close()
        return False

def delete_all_users(conn):
    """Delete ALL users from database"""
    cursor = conn.cursor()
    
    # Get user count
    user_count = get_user_count(conn)
    if user_count == 0:
        print("ℹ️  No users in database")
        cursor.close()
        return
    
    print(f"\n⚠️  WARNING: This will delete ALL {user_count} users from the database!")
    print("This action cannot be undone!")
    
    # Double confirmation
    confirm1 = input("\nAre you absolutely sure? Type 'DELETE ALL USERS' to confirm: ")
    if confirm1 != 'DELETE ALL USERS':
        print("❌ Deletion cancelled")
        cursor.close()
        return
    
    confirm2 = input("Final confirmation - type 'yes' to proceed: ").lower()
    if confirm2 != 'yes':
        print("❌ Deletion cancelled")
        cursor.close()
        return
    
    try:
        print("\n🔥 Starting complete database cleanup...")
        
        # Execute the complete cleanup (same as final_user_cleanup.sql)
        cleanup_sql = """
        -- Delete all financial records
        DELETE FROM accounting_transactions;
        DELETE FROM accounting_journal_entries;
        DELETE FROM accounting_purchase_receipts;
        DELETE FROM accounting_bank_reconciliations;
        DELETE FROM accounting_budgets;
        DELETE FROM accounting_recurring_transactions;
        
        -- Delete all payroll records
        DELETE FROM payroll_pay_stubs;
        DELETE FROM payroll_runs;
        DELETE FROM payroll_employee_salaries;
        DELETE FROM payroll_deductions;
        DELETE FROM payroll_benefits;
        
        -- Delete all tax records
        DELETE FROM tax_filings;
        DELETE FROM tax_payments;
        DELETE FROM tax_codes;
        
        -- Delete all sales records
        DELETE FROM sales_payment_allocations;
        DELETE FROM sales_invoice_payments;
        DELETE FROM sales_invoice_line_items;
        DELETE FROM sales_invoices;
        DELETE FROM sales_quotes;
        
        -- Delete all purchase records
        DELETE FROM purchases_bill_payments;
        DELETE FROM purchases_bill_line_items;
        DELETE FROM purchases_bills;
        DELETE FROM purchases_purchase_orders;
        
        -- Delete all inventory
        DELETE FROM inventory_stock_adjustments;
        DELETE FROM inventory_stock_levels;
        DELETE FROM inventory_products;
        DELETE FROM inventory_categories;
        
        -- Delete all basic records
        DELETE FROM accounts;
        DELETE FROM customers;
        DELETE FROM vendors;
        DELETE FROM items;
        
        -- Delete all HR records
        DELETE FROM hr_leave_requests;
        DELETE FROM hr_departments;
        DELETE FROM hr_positions;
        
        -- Delete all system records
        DELETE FROM notifications;
        DELETE FROM audit_logs;
        DELETE FROM user_activities;
        DELETE FROM api_tokens;
        DELETE FROM integrations;
        DELETE FROM subscription_credits;
        DELETE FROM django_admin_log;
        
        -- Delete all employees
        DELETE FROM employees;
        
        -- Delete all businesses
        DELETE FROM businesses;
        
        -- Delete all users
        DELETE FROM custom_auth_user;
        """
        
        cursor.execute(cleanup_sql)
        conn.commit()
        
        print("✅ Successfully deleted ALL users and related data")
        cursor.close()
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during cleanup: {e}")
        cursor.close()
        return False

def main():
    """Main function"""
    print("🧹 Dott Database User Cleanup Tool")
    print("=" * 50)
    
    # Connect to database
    conn = get_db_connection()
    
    # Show current user count
    user_count = get_user_count(conn)
    print(f"\n📊 Current users in database: {user_count}")
    
    if user_count == 0:
        print("ℹ️  No users to delete")
        conn.close()
        return
    
    while True:
        print("\n🔧 Options:")
        print("1. Delete specific user by email")
        print("2. Delete ALL users (⚠️  DANGER)")
        print("3. List all users")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == '1':
            email = input("\nEnter email address of user to delete: ").strip()
            if email:
                delete_specific_user(conn, email)
            else:
                print("❌ Email cannot be empty")
                
        elif choice == '2':
            delete_all_users(conn)
            
        elif choice == '3':
            users = list_users(conn)
            if users:
                print("\n📋 Current users:")
                print("-" * 70)
                print(f"{'ID':<10} {'Email':<40} {'Name':<20}")
                print("-" * 70)
                for user_id, email, first_name, last_name in users:
                    name = f"{first_name or ''} {last_name or ''}".strip() or 'N/A'
                    print(f"{user_id:<10} {email:<40} {name:<20}")
            else:
                print("ℹ️  No users in database")
                
        elif choice == '4':
            print("\n👋 Goodbye!")
            break
            
        else:
            print("❌ Invalid choice, please try again")
    
    conn.close()

if __name__ == "__main__":
    main()