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
        
        # Tables to delete from in dependency order
        deletion_queries = [
            # Auth token - may not exist
            ("DELETE FROM authtoken_token WHERE user_id = %s", True),  # True = optional table
            
            # Django session data
            ("DELETE FROM django_session WHERE session_data LIKE %s", True, f"%{user_id}%"),
            
            # App-specific tables
            ("DELETE FROM notifications_usernotification WHERE user_id = %s", False),
            ("DELETE FROM taxes_usertaxsetting WHERE user_id = %s", False),
            ("DELETE FROM taxes_taxtransaction WHERE user_id = %s", False),
            ("DELETE FROM taxes_taxfiling WHERE user_id = %s", False),
            ("DELETE FROM taxes_taxreminder WHERE user_id = %s", False),
            ("DELETE FROM sales_customer WHERE created_by_id = %s", False),
            ("DELETE FROM sales_invoice WHERE created_by_id = %s", False),
            ("DELETE FROM sales_payment WHERE created_by_id = %s", False),
            ("DELETE FROM hr_employee WHERE user_id = %s", False),
            ("DELETE FROM hr_leave WHERE employee_id IN (SELECT id FROM hr_employee WHERE user_id = %s)", False),
            ("DELETE FROM hr_attendance WHERE employee_id IN (SELECT id FROM hr_employee WHERE user_id = %s)", False),
            ("DELETE FROM payroll_payrun WHERE created_by_id = %s", False),
            ("DELETE FROM payroll_payslip WHERE employee_id IN (SELECT id FROM hr_employee WHERE user_id = %s)", False),
            ("DELETE FROM finance_account WHERE created_by_id = %s", False),
            ("DELETE FROM finance_transaction WHERE created_by_id = %s", False),
            ("DELETE FROM finance_journalentry WHERE created_by_id = %s", False),
            ("DELETE FROM inventory_product WHERE created_by_id = %s", False),
            ("DELETE FROM inventory_stockmovement WHERE created_by_id = %s", False),
            ("DELETE FROM purchases_vendor WHERE created_by_id = %s", False),
            ("DELETE FROM purchases_purchaseorder WHERE created_by_id = %s", False),
            ("DELETE FROM purchases_bill WHERE created_by_id = %s", False),
            ("DELETE FROM banking_bankaccount WHERE user_id = %s", False),
            ("DELETE FROM banking_banktransaction WHERE imported_by_id = %s", False),
            ("DELETE FROM payments_paymentmethod WHERE user_id = %s", False),
            ("DELETE FROM payments_paymenttransaction WHERE user_id = %s", False),
            ("DELETE FROM reports_reportgeneration WHERE user_id = %s", False),
            ("DELETE FROM integrations_integration WHERE user_id = %s", False),
            ("DELETE FROM crm_contact WHERE created_by_id = %s", False),
            ("DELETE FROM crm_deal WHERE created_by_id = %s", False),
            ("DELETE FROM crm_activity WHERE created_by_id = %s", False),
            ("DELETE FROM events_event WHERE created_by_id = %s", False),
            ("DELETE FROM transport_vehicle WHERE created_by_id = %s", False),
            ("DELETE FROM transport_trip WHERE driver_id IN (SELECT id FROM hr_employee WHERE user_id = %s)", False),
            
            # Business and tenant data
            ("DELETE FROM users_business WHERE owner_id = %s", False),
            ("DELETE FROM users_businessmember WHERE user_id = %s", False),
            ("DELETE FROM users_profile WHERE user_id = %s", False),
            ("DELETE FROM users_onboardingprogress WHERE user_id = %s", False),
            
            # Finally delete the user
            ("DELETE FROM custom_auth_user WHERE id = %s", False),
        ]
        
        with transaction.atomic():
            with connection.cursor() as cursor:
                for query_info in deletion_queries:
                    query = query_info[0]
                    is_optional = query_info[1] if len(query_info) > 1 else False
                    params = query_info[2] if len(query_info) > 2 else user_id
                    
                    try:
                        # For optional tables, check if they exist first
                        if is_optional:
                            table_name = query.split("FROM")[1].split("WHERE")[0].strip()
                            cursor.execute("""
                                SELECT EXISTS (
                                    SELECT FROM information_schema.tables 
                                    WHERE table_name = %s
                                );
                            """, [table_name])
                            
                            if not cursor.fetchone()[0]:
                                logger.info(f"Skipping {table_name} - table doesn't exist")
                                continue
                        
                        cursor.execute(query, [params])
                        deleted_count = cursor.rowcount
                        if deleted_count > 0:
                            logger.info(f"Deleted {deleted_count} rows from {query.split('FROM')[1].split('WHERE')[0].strip()}")
                    
                    except Exception as e:
                        if is_optional:
                            logger.warning(f"Optional table operation failed (continuing): {str(e)}")
                        else:
                            raise e
                
                # Also delete the tenant if the user is the owner
                cursor.execute("""
                    DELETE FROM custom_auth_tenant 
                    WHERE id IN (
                        SELECT tenant_id FROM custom_auth_user WHERE id = %s
                    ) AND owner_id = %s
                """, [user_id, str(user_id)])
                
                if cursor.rowcount > 0:
                    logger.info(f"Deleted tenant owned by user {email}")
        
        logger.info(f"Successfully deleted user {email} and all related data")
        return True, "User deleted successfully"
        
    except User.DoesNotExist:
        return False, f"User {email} not found"
    except Exception as e:
        logger.error(f"Error deleting user {email}: {str(e)}")
        return False, str(e)