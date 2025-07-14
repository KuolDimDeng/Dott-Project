"""
Utility functions for safe user deletion that handle missing tables gracefully
"""
import logging
from django.db import connection, transaction
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)


def delete_user_safely(email):
    """
    Safely delete a user and all related data, handling missing tables gracefully.
    Returns tuple (success, message)
    """
    try:
        user = User.objects.get(email=email)
        user_id = user.id
        
        # Get list of all tables in the database
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
            """)
            existing_tables = {row[0] for row in cursor.fetchall()}
            logger.info(f"Found {len(existing_tables)} tables in database")
        
        # Tables to delete from in dependency order
        # Format: (query, table_name, params)
        deletion_queries = [
            # Auth token
            ("DELETE FROM authtoken_token WHERE user_id = %s", "authtoken_token", user_id),
            
            # Django session data
            ("DELETE FROM django_session WHERE session_data LIKE %s", "django_session", f"%{user_id}%"),
            
            # Notifications
            ("DELETE FROM notifications_usernotification WHERE user_id = %s", "notifications_usernotification", user_id),
            ("DELETE FROM notifications_adminnotification WHERE created_by_id = %s", "notifications_adminnotification", user_id),
            
            # Tax tables
            ("DELETE FROM taxes_usertaxsetting WHERE user_id = %s", "taxes_usertaxsetting", user_id),
            ("DELETE FROM taxes_taxtransaction WHERE user_id = %s", "taxes_taxtransaction", user_id),
            ("DELETE FROM taxes_taxfiling WHERE user_id = %s", "taxes_taxfiling", user_id),
            ("DELETE FROM taxes_taxreminder WHERE user_id = %s", "taxes_taxreminder", user_id),
            ("DELETE FROM taxes_taxfeedback WHERE submitted_by_id = %s", "taxes_taxfeedback", user_id),
            
            # Sales tables
            ("DELETE FROM sales_customer WHERE created_by_id = %s", "sales_customer", user_id),
            ("DELETE FROM sales_invoice WHERE created_by_id = %s", "sales_invoice", user_id),
            ("DELETE FROM sales_payment WHERE created_by_id = %s", "sales_payment", user_id),
            
            # HR tables
            ("DELETE FROM hr_leave WHERE employee_id IN (SELECT id FROM hr_employee WHERE user_id = %s)", "hr_leave", user_id),
            ("DELETE FROM hr_attendance WHERE employee_id IN (SELECT id FROM hr_employee WHERE user_id = %s)", "hr_attendance", user_id),
            ("DELETE FROM hr_employee WHERE user_id = %s", "hr_employee", user_id),
            
            # Payroll tables
            ("DELETE FROM payroll_payslip WHERE employee_id IN (SELECT id FROM hr_employee WHERE user_id = %s)", "payroll_payslip", user_id),
            ("DELETE FROM payroll_payrun WHERE created_by_id = %s", "payroll_payrun", user_id),
            
            # Finance tables
            ("DELETE FROM finance_account WHERE created_by_id = %s", "finance_account", user_id),
            ("DELETE FROM finance_transaction WHERE created_by_id = %s", "finance_transaction", user_id),
            ("DELETE FROM finance_journalentry WHERE created_by_id = %s", "finance_journalentry", user_id),
            
            # Inventory tables
            ("DELETE FROM inventory_product WHERE created_by_id = %s", "inventory_product", user_id),
            ("DELETE FROM inventory_stockmovement WHERE created_by_id = %s", "inventory_stockmovement", user_id),
            
            # Purchase tables
            ("DELETE FROM purchases_vendor WHERE created_by_id = %s", "purchases_vendor", user_id),
            ("DELETE FROM purchases_purchaseorder WHERE created_by_id = %s", "purchases_purchaseorder", user_id),
            ("DELETE FROM purchases_bill WHERE created_by_id = %s", "purchases_bill", user_id),
            
            # Banking tables
            ("DELETE FROM banking_bankaccount WHERE user_id = %s", "banking_bankaccount", user_id),
            ("DELETE FROM banking_banktransaction WHERE imported_by_id = %s", "banking_banktransaction", user_id),
            
            # Payment tables
            ("DELETE FROM payments_paymentmethod WHERE user_id = %s", "payments_paymentmethod", user_id),
            ("DELETE FROM payments_paymenttransaction WHERE user_id = %s", "payments_paymenttransaction", user_id),
            
            # Other app tables
            ("DELETE FROM reports_reportgeneration WHERE user_id = %s", "reports_reportgeneration", user_id),
            ("DELETE FROM integrations_integration WHERE user_id = %s", "integrations_integration", user_id),
            
            # CRM tables
            ("DELETE FROM crm_contact WHERE created_by_id = %s", "crm_contact", user_id),
            ("DELETE FROM crm_deal WHERE created_by_id = %s", "crm_deal", user_id),
            ("DELETE FROM crm_activity WHERE created_by_id = %s", "crm_activity", user_id),
            
            # Event tables
            ("DELETE FROM events_event WHERE created_by_id = %s", "events_event", user_id),
            
            # Transport tables
            ("DELETE FROM transport_trip WHERE driver_id IN (SELECT id FROM hr_employee WHERE user_id = %s)", "transport_trip", user_id),
            ("DELETE FROM transport_vehicle WHERE created_by_id = %s", "transport_vehicle", user_id),
            
            # Business and user profile tables
            ("DELETE FROM users_business WHERE owner_id = %s", "users_business", user_id),
            ("DELETE FROM users_businessmember WHERE user_id = %s", "users_businessmember", user_id),
            ("DELETE FROM users_profile WHERE user_id = %s", "users_profile", user_id),
            ("DELETE FROM users_onboardingprogress WHERE user_id = %s", "users_onboardingprogress", user_id),
        ]
        
        deleted_tables = []
        skipped_tables = []
        
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Process each deletion query
                for query, table_name, params in deletion_queries:
                    # Extract base table name (for subqueries)
                    base_table = table_name.split()[0]
                    
                    # Check if table exists
                    if base_table not in existing_tables:
                        skipped_tables.append(base_table)
                        logger.info(f"Skipping {base_table} - table doesn't exist")
                        continue
                    
                    try:
                        cursor.execute(query, [params])
                        deleted_count = cursor.rowcount
                        if deleted_count > 0:
                            deleted_tables.append((base_table, deleted_count))
                            logger.info(f"Deleted {deleted_count} rows from {base_table}")
                    except Exception as e:
                        logger.warning(f"Error deleting from {base_table}: {str(e)}")
                        # Continue with other tables
                
                # Delete tenant if user is the owner
                if 'custom_auth_tenant' in existing_tables:
                    cursor.execute("""
                        DELETE FROM custom_auth_tenant 
                        WHERE id IN (
                            SELECT tenant_id FROM custom_auth_user WHERE id = %s
                        ) AND owner_id = %s
                    """, [user_id, str(user_id)])
                    
                    if cursor.rowcount > 0:
                        logger.info(f"Deleted tenant owned by user {email}")
                
                # Finally delete the user
                cursor.execute("DELETE FROM custom_auth_user WHERE id = %s", [user_id])
                if cursor.rowcount > 0:
                    logger.info(f"Deleted user {email}")
        
        summary = f"Successfully deleted user {email}. "
        if deleted_tables:
            summary += f"Deleted from {len(deleted_tables)} tables. "
        if skipped_tables:
            summary += f"Skipped {len(skipped_tables)} non-existent tables."
        
        logger.info(summary)
        return True, summary
        
    except User.DoesNotExist:
        return False, f"User {email} not found"
    except Exception as e:
        logger.error(f"Error deleting user {email}: {str(e)}")
        return False, str(e)