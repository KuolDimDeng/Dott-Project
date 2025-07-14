#!/usr/bin/env python3
"""
Force delete ALL data for a specific user email across all tables
This script finds and deletes data even if the interactive script missed it
"""
import os
import sys
import django
from pathlib import Path

# Add the parent directory to the path
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def force_delete_all_user_data(email):
    """Force delete ALL data for a user across all tables"""
    logger.info(f"\n🔥 FORCE DELETING ALL DATA for user: {email}")
    
    with connection.cursor() as cursor:
        # First, find the user ID if it exists
        cursor.execute("SELECT id FROM custom_auth_user WHERE email = %s", [email])
        user_data = cursor.fetchone()
        user_id = user_data[0] if user_data else None
        
        if user_id:
            logger.info(f"Found user ID: {user_id}")
        
        # Get tenant_id from multiple possible sources
        tenant_id = None
        if user_id:
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
                logger.info(f"Found tenant ID: {tenant_id}")
        
        # Manual deletion order based on foreign key constraints
        deletions = []
        
        # 1. Delete notification data (uses email)
        deletions.extend([
            ("DELETE FROM notification_recipients WHERE user_email = %s", email, "notification_recipients"),
            ("DELETE FROM user_notification_settings WHERE user_email = %s", email, "user_notification_settings"),
        ])
        
        # 2. Delete Auth0 related data (uses email)
        deletions.extend([
            ("DELETE FROM custom_auth_userinvitation WHERE email = %s", email, "custom_auth_userinvitation"),
        ])
        
        if user_id:
            # 3. Delete session management data
            deletions.extend([
                ("DELETE FROM session_manager_securityevent WHERE user_id = %s", user_id, "session_manager_securityevent"),
                ("DELETE FROM session_manager_devicefingerprint WHERE user_id = %s", user_id, "session_manager_devicefingerprint"),
                ("DELETE FROM session_manager_session WHERE user_id = %s", user_id, "session_manager_session"),
            ])
            
            # 4. Delete onboarding data
            deletions.extend([
                ("DELETE FROM onboarding_onboardingprogress WHERE user_id = %s", user_id, "onboarding_onboardingprogress"),
            ])
            
            # 5. Delete audit data
            deletions.extend([
                ("DELETE FROM audit_auditlog WHERE user_id = %s", user_id, "audit_auditlog"),
                ("DELETE FROM django_admin_log WHERE user_id = %s", user_id, "django_admin_log"),
            ])
            
            # 6. Delete user permissions
            deletions.extend([
                ("DELETE FROM custom_auth_userpageaccess WHERE user_id = %s", user_id, "custom_auth_userpageaccess"),
            ])
            
            # 7. Delete HR data
            deletions.extend([
                ("DELETE FROM hr_employee WHERE user_id = %s", user_id, "hr_employee"),
            ])
            
            # 8. Delete business ownership
            deletions.extend([
                ("DELETE FROM businesses WHERE owner_id = %s", user_id, "businesses"),
            ])
            
            # 9. Delete tenant ownership (owner_id is varchar)
            deletions.extend([
                ("DELETE FROM custom_auth_tenant WHERE owner_id = %s", str(user_id), "custom_auth_tenant"),
            ])
            
            # 10. Delete smart insights data
            deletions.extend([
                ("DELETE FROM smart_insights_credittransaction WHERE user_id = %s", user_id, "smart_insights_credittransaction"),
                ("DELETE FROM smart_insights_usercredit WHERE user_id = %s", user_id, "smart_insights_usercredit"),
                ("DELETE FROM smart_insights_usagetracking WHERE user_id = %s", user_id, "smart_insights_usagetracking"),
            ])
        
        # If we have tenant_id, delete tenant-specific data
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
                deletions.append((f"DELETE FROM {table} WHERE tenant_id = %s", tenant_id, table))
        
        # Finally, delete the user itself
        if user_id:
            deletions.append(("DELETE FROM custom_auth_user WHERE id = %s", user_id, "custom_auth_user"))
        
        # Execute all deletions
        total_deleted = 0
        with transaction.atomic():
            for query, param, table_name in deletions:
                try:
                    cursor.execute(query, [param])
                    rows = cursor.rowcount
                    if rows > 0:
                        logger.info(f"  ✓ Deleted {rows} rows from {table_name}")
                        total_deleted += rows
                except Exception as e:
                    # Table might not exist, that's ok
                    pass
        
        logger.info(f"\n✅ Force deletion complete! Deleted {total_deleted} total rows")
        
        # Verify deletion
        cursor.execute("SELECT id FROM custom_auth_user WHERE email = %s", [email])
        if cursor.fetchone():
            logger.error("⚠️  WARNING: User still exists in custom_auth_user!")
        else:
            logger.info("✓ User successfully removed from custom_auth_user")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python force_delete_user_complete.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    
    # Confirm
    confirm = input(f"Are you sure you want to FORCE DELETE all data for {email}? (yes/no): ")
    if confirm.lower() == 'yes':
        force_delete_all_user_data(email)
    else:
        print("Deletion cancelled")