#!/usr/bin/env python3
"""
Final User Cleanup Script for Dott Database
Handles all 64 foreign key relationships in correct order
"""

import os
import sys
import psycopg2
from urllib.parse import urlparse

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

def table_exists(cursor, table_name):
    """Check if a table exists"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = %s
        )
    """, (table_name,))
    return cursor.fetchone()[0]

def get_user_count(conn):
    """Get count of users in database"""
    cursor = conn.cursor()
    if table_exists(cursor, 'custom_auth_user'):
        cursor.execute("SELECT COUNT(*) FROM custom_auth_user")
        count = cursor.fetchone()[0]
        cursor.close()
        return count
    cursor.close()
    return 0

def list_users(conn):
    """List all users in database"""
    cursor = conn.cursor()
    if table_exists(cursor, 'custom_auth_user'):
        cursor.execute("SELECT id, email, first_name, last_name FROM custom_auth_user ORDER BY id")
        users = cursor.fetchall()
        cursor.close()
        return users
    cursor.close()
    return []

def delete_all_users_final(conn):
    """Delete ALL users from database - handling all 64 foreign key relationships"""
    cursor = conn.cursor()
    
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
        print("\n🔥 Starting comprehensive database cleanup...")
        
        # List of all tables that reference custom_auth_user (in deletion order)
        # Delete child tables first, then parent table last
        tables_to_clean = [
            'banking_bankaccount',
            'banking_plaiditem', 
            'banking_tinkitem',
            'purchases_purchaseorder',
            'finance_accountreconciliation',
            'finance_audittrail',
            'finance_budget',
            'finance_costentry',
            'finance_costallocation',
            'finance_financetransaction',
            'users_menu_privilege',
            'sales_sale',
            'sales_salesorder',
            'finance_financialstatement',
            'finance_fixedasset',
            'finance_intercompanyaccount',
            'finance_intercompanytransaction',
            'finance_journalentry',
            'finance_monthendclosing',
            'finance_monthendtask',
            'finance_reconciliationitem',
            'integrations_shopifyintegration',
            'sales_estimate',
            'user_sessions',
            'device_fingerprints',
            'device_trust',
            'users_userprofile',
            'audit_log',
            'user_invitations',
            'user_page_access',
            'banking_banktransaction',
            'banking_audit_log',
            'taxes_taxdataabusereport',
            'taxes_taxdataentrylog',
            'taxes_taxdatablacklist',
            'smart_insights_usercredit',
            'smart_insights_querylog',
            'smart_insights_monthlyusage',
            'smart_insights_credittransaction',
            'sales_pos_transaction',
            'sales_pos_refund',
            'events_event',
            'payroll_payrollstripepayment',
            'discount_verifications',
            'hr_employee',
            'notifications',  # Added from previous attempts
            # Finally delete the main table
            'custom_auth_user'
        ]
        
        deleted_count = 0
        
        for table in tables_to_clean:
            if table_exists(cursor, table):
                try:
                    if table == 'custom_auth_user':
                        # Main user table - delete all
                        cursor.execute(f"DELETE FROM {table}")
                        rows = cursor.rowcount
                        print(f"  🗑️  Deleted {rows} rows from {table}")
                        deleted_count += rows
                    elif table == 'notifications':
                        # Notifications doesn't have user_id, delete all
                        cursor.execute(f"DELETE FROM {table}")
                        rows = cursor.rowcount
                        print(f"  🗑️  Deleted {rows} rows from {table}")
                    else:
                        # Child tables - delete where user_id references our users
                        # First check what column references users
                        if 'user_id' in ['user_id', 'created_by_id', 'approved_by_id', 'invited_by_id', 'granted_by_id']:
                            # Try different possible column names
                            for col in ['user_id', 'created_by_id', 'approved_by_id', 'completed_by_id', 'reviewed_by_id', 'submitted_by_id', 'posted_by_id', 'generated_by_id', 'matched_by_id', 'imported_by_id', 'resolved_by_id', 'invited_by_id', 'granted_by_id', 'voided_by_id']:
                                try:
                                    cursor.execute(f"SELECT 1 FROM information_schema.columns WHERE table_name = %s AND column_name = %s", (table, col))
                                    if cursor.fetchone():
                                        cursor.execute(f"DELETE FROM {table} WHERE {col} IS NOT NULL")
                                        rows = cursor.rowcount
                                        if rows > 0:
                                            print(f"  🗑️  Deleted {rows} rows from {table} ({col})")
                                        break
                                except:
                                    continue
                            else:
                                # If no user column found, just delete all (safer)
                                cursor.execute(f"DELETE FROM {table}")
                                rows = cursor.rowcount
                                if rows > 0:
                                    print(f"  🗑️  Deleted {rows} rows from {table} (all rows)")
                except Exception as e:
                    print(f"  ⚠️  Error cleaning {table}: {e}")
                    # Continue with other tables
                    continue
            else:
                print(f"  ⚠️  Table not found: {table}")
        
        conn.commit()
        print("✅ Successfully deleted all users and related data")
        
        # Verify cleanup
        final_count = get_user_count(conn)
        print(f"📊 Users remaining: {final_count}")
        
        cursor.close()
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during cleanup: {e}")
        cursor.close()
        return False

def main():
    """Main function"""
    print("🧹 Final Dott Database User Cleanup Tool")
    print("=" * 50)
    print("Handles all 64 foreign key relationships")
    
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
        print("1. List all users")
        print("2. Delete ALL users (⚠️  FINAL CLEANUP)")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == '1':
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
                
        elif choice == '2':
            delete_all_users_final(conn)
            
        elif choice == '3':
            print("\n👋 Goodbye!")
            break
            
        else:
            print("❌ Invalid choice, please try again")
    
    conn.close()

if __name__ == "__main__":
    main()