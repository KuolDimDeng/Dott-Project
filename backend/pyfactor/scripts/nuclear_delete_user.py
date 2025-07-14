#!/usr/bin/env python3
"""
Nuclear option - delete user by directly executing SQL queries without Django ORM
This bypasses all safety checks and directly deletes from the database
"""
import os
import psycopg2
from urllib.parse import urlparse

def nuclear_delete_user(email):
    """Delete ALL data for a user using direct SQL"""
    
    # Parse DATABASE_URL
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    # Parse the URL
    parsed = urlparse(database_url)
    
    # Connect to database
    conn = psycopg2.connect(
        database=parsed.path[1:],
        user=parsed.username,
        password=parsed.password,
        host=parsed.hostname,
        port=parsed.port
    )
    conn.autocommit = False  # Use transaction
    cursor = conn.cursor()
    
    try:
        print(f"\n🔥 NUCLEAR DELETE for user: {email}")
        
        # Get user ID
        cursor.execute("SELECT id FROM custom_auth_user WHERE email = %s", (email,))
        result = cursor.fetchone()
        
        if not result:
            print(f"❌ User {email} not found")
            return
        
        user_id = result[0]
        print(f"Found user ID: {user_id}")
        
        # Get tenant ID from various sources
        cursor.execute("""
            SELECT COALESCE(
                (SELECT tenant_id FROM hr_employee WHERE user_id = %s LIMIT 1),
                (SELECT id FROM custom_auth_tenant WHERE owner_id = %s::text LIMIT 1),
                (SELECT tenant_id FROM custom_auth_user WHERE id = %s LIMIT 1)
            )
        """, (user_id, str(user_id), user_id))
        result = cursor.fetchone()
        tenant_id = result[0] if result and result[0] else None
        
        if tenant_id:
            print(f"Found tenant ID: {tenant_id}")
        
        print("\n🗑️  Starting nuclear deletion...")
        
        # List of all deletions in dependency order
        deletions = []
        
        # 1. Smart insights tables
        deletions.extend([
            (f"DELETE FROM smart_insights_credittransaction WHERE user_id = {user_id}", "smart_insights_credittransaction"),
            (f"DELETE FROM smart_insights_usercredit WHERE user_id = {user_id}", "smart_insights_usercredit"),
            (f"DELETE FROM smart_insights_usagetracking WHERE user_id = {user_id}", "smart_insights_usagetracking"),
        ])
        
        # 2. Notification tables (use email)
        deletions.extend([
            (f"DELETE FROM notification_recipients WHERE user_email = '{email}'", "notification_recipients"),
            (f"DELETE FROM user_notification_settings WHERE user_email = '{email}'", "user_notification_settings"),
        ])
        
        # 3. Session management
        deletions.extend([
            (f"DELETE FROM session_manager_securityevent WHERE user_id = {user_id}", "session_manager_securityevent"),
            (f"DELETE FROM session_manager_devicefingerprint WHERE user_id = {user_id}", "session_manager_devicefingerprint"),
            (f"DELETE FROM session_manager_session WHERE user_id = {user_id}", "session_manager_session"),
        ])
        
        # 4. Onboarding
        deletions.extend([
            (f"DELETE FROM onboarding_onboardingprogress WHERE user_id = {user_id}", "onboarding_onboardingprogress"),
        ])
        
        # 5. Audit logs
        deletions.extend([
            (f"DELETE FROM audit_auditlog WHERE user_id = {user_id}", "audit_auditlog"),
            (f"DELETE FROM django_admin_log WHERE user_id = {user_id}", "django_admin_log"),
        ])
        
        # 6. User permissions
        deletions.extend([
            (f"DELETE FROM custom_auth_userpageaccess WHERE user_id = {user_id}", "custom_auth_userpageaccess"),
            (f"DELETE FROM custom_auth_userinvitation WHERE email = '{email}'", "custom_auth_userinvitation"),
        ])
        
        # 7. HR data
        deletions.extend([
            (f"DELETE FROM hr_employee WHERE user_id = {user_id}", "hr_employee"),
        ])
        
        # 8. Business data
        deletions.extend([
            (f"DELETE FROM businesses WHERE owner_id = {user_id}", "businesses"),
        ])
        
        # 9. Tenant data (owner_id is varchar)
        deletions.extend([
            (f"DELETE FROM custom_auth_tenant WHERE owner_id = '{user_id}'", "custom_auth_tenant"),
        ])
        
        # 10. If we have tenant_id, delete tenant-specific data
        if tenant_id:
            tenant_tables = [
                "accounting_accounts",
                "accounting_transactions",
                "accounting_journal_entries",
                "accounting_journal_line_items",
                "payroll_pay_stubs",
                "payroll_runs",
                "payroll_employee_salaries",
                "sales_invoices",
                "sales_invoice_line_items",
                "purchases_bills",
                "purchases_bill_line_items",
                "inventory_products",
                "hr_timesheets",
                "hr_departments",
                "taxes_filings",
                "events_event",
                "crm_contact",
                "crm_lead",
            ]
            
            for table in tenant_tables:
                deletions.append((f"DELETE FROM {table} WHERE tenant_id = '{tenant_id}'", table))
        
        # Execute all deletions
        total_deleted = 0
        for query, table_name in deletions:
            try:
                cursor.execute(query)
                rows = cursor.rowcount
                if rows > 0:
                    print(f"  ✓ Deleted {rows} rows from {table_name}")
                    total_deleted += rows
            except Exception as e:
                # Table might not exist, continue
                pass
        
        # Finally, delete the user
        cursor.execute(f"DELETE FROM custom_auth_user WHERE id = {user_id}")
        if cursor.rowcount > 0:
            print(f"  ✓ Deleted user record from custom_auth_user")
            total_deleted += 1
        
        # Commit the transaction
        conn.commit()
        print(f"\n✅ Nuclear deletion complete! Deleted {total_deleted} total rows")
        
        # Verify deletion
        cursor.execute("SELECT id FROM custom_auth_user WHERE email = %s", (email,))
        if cursor.fetchone():
            print("⚠️  WARNING: User still exists!")
        else:
            print("✓ User successfully deleted")
            
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during deletion: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python nuclear_delete_user.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    
    # Triple confirmation for nuclear option
    print(f"\n⚠️  NUCLEAR DELETE WARNING ⚠️")
    print(f"This will PERMANENTLY delete ALL data for {email}")
    print("This action CANNOT be undone!")
    
    confirm1 = input("\nType 'DELETE' to proceed: ")
    if confirm1 != 'DELETE':
        print("Cancelled")
        sys.exit(0)
    
    confirm2 = input("Are you ABSOLUTELY sure? Type 'yes' to confirm: ")
    if confirm2.lower() != 'yes':
        print("Cancelled")
        sys.exit(0)
    
    nuclear_delete_user(email)