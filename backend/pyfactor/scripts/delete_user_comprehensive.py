#!/usr/bin/env python
"""
Comprehensive user deletion script that handles all foreign key dependencies
Can be run on production server or locally with database access
"""

import os
import sys
import django
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction, connection
from django.contrib.auth import get_user_model
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class UserDeletion:
    """Handles comprehensive user deletion with all dependencies"""
    
    def __init__(self):
        self.User = get_user_model()
        self.deleted_tables = []
        self.error_tables = []
        
    def find_user(self, email):
        """Find user by email"""
        try:
            user = self.User.objects.filter(email=email).first()
            if user:
                logger.info(f"✅ Found user: {email}")
                logger.info(f"  - User ID: {user.id}")
                logger.info(f"  - Date joined: {user.date_joined}")
                logger.info(f"  - Is active: {user.is_active}")
                logger.info(f"  - Tenant ID: {getattr(user, 'tenant_id', 'None')}")
                return user
            else:
                logger.info(f"❌ User not found: {email}")
                return None
        except Exception as e:
            logger.error(f"Error finding user: {str(e)}")
            return None
    
    def count_related_records(self, user_id):
        """Count all related records for the user"""
        counts = {}
        
        with connection.cursor() as cursor:
            # Define tables and their user reference columns
            tables_to_check = [
                ('smart_insights_credittransaction', 'user_id'),
                ('smart_insights_usercredit', 'user_id'),
                ('audit_log', 'user_id'),
                ('session_events', 'session_id', 'user_sessions'),  # Indirect through user_sessions
                ('session_security', 'session_id', 'user_sessions'),  # Indirect through user_sessions
                ('user_sessions', 'user_id'),
                ('users_userprofile', 'user_id'),
                ('hr_employee', 'user_id'),
                ('notifications_notification', 'user_id'),
                ('events_event', 'created_by_id'),
                ('sales_customer', 'created_by_id'),
                ('sales_invoice', 'created_by_id'),
                ('inventory_product', 'created_by_id'),
                ('purchases_purchaseorder', 'created_by_id'),
                ('vendors_vendor', 'created_by_id'),
                ('finance_transaction', 'created_by_id'),
                ('taxes_taxfiling', 'user_id'),
                ('banking_bankaccount', 'user_id'),
                ('payments_payment', 'user_id'),
                ('payroll_payrollrun', 'created_by_id'),
                ('timesheets_timesheet', 'employee_id'),
                ('analysis_analysisreport', 'created_by_id'),
                ('jobs_job', 'created_by_id'),
                ('crm_contact', 'created_by_id'),
                ('transport_vehicle', 'created_by_id'),
                ('whatsapp_business_whatsappmessage', 'user_id'),
                ('data_export_exportrequest', 'user_id'),
                ('communications_communication', 'user_id'),
            ]
            
            for table_info in tables_to_check:
                table_name = table_info[0]
                column_name = table_info[1]
                
                try:
                    # Check if table exists
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = %s
                        )
                    """, [table_name])
                    
                    if cursor.fetchone()[0]:
                        if len(table_info) == 3:  # Indirect reference
                            # For session-related tables
                            cursor.execute(f"""
                                SELECT COUNT(*) 
                                FROM {table_name} 
                                WHERE {column_name} IN (
                                    SELECT session_id FROM user_sessions WHERE user_id = %s
                                )
                            """, [user_id])
                        else:
                            # Direct reference
                            cursor.execute(f"""
                                SELECT COUNT(*) 
                                FROM {table_name} 
                                WHERE {column_name} = %s
                            """, [user_id])
                        
                        count = cursor.fetchone()[0]
                        if count > 0:
                            counts[table_name] = count
                            logger.info(f"  - {table_name}: {count} records")
                except Exception as e:
                    # Table might not exist or have the column
                    pass
        
        total = sum(counts.values())
        logger.info(f"\n📊 Total related records: {total}")
        return counts
    
    def delete_user_data(self, user_id, email, dry_run=False):
        """Delete user and all related data in correct order"""
        
        if dry_run:
            logger.info("\n🔍 DRY RUN MODE - No actual deletions will occur")
        
        deletion_queries = [
            # Smart Insights
            "DELETE FROM smart_insights_credittransaction WHERE user_id = %s",
            "DELETE FROM smart_insights_usercredit WHERE user_id = %s",
            
            # Audit logs
            "DELETE FROM audit_log WHERE user_id = %s",
            
            # Session-related (indirect references)
            "DELETE FROM session_events WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = %s)",
            "DELETE FROM session_security WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = %s)",
            "DELETE FROM user_sessions WHERE user_id = %s",
            
            # User profile and employee
            "DELETE FROM users_userprofile WHERE user_id = %s",
            "DELETE FROM hr_employee WHERE user_id = %s",
            
            # Notifications
            "DELETE FROM notifications_notification WHERE user_id = %s",
            
            # Various created_by references (these might cascade)
            "DELETE FROM events_event WHERE created_by_id = %s",
            "DELETE FROM sales_customer WHERE created_by_id = %s",
            "DELETE FROM sales_invoice WHERE created_by_id = %s",
            "DELETE FROM inventory_product WHERE created_by_id = %s",
            "DELETE FROM purchases_purchaseorder WHERE created_by_id = %s",
            "DELETE FROM vendors_vendor WHERE created_by_id = %s",
            "DELETE FROM finance_transaction WHERE created_by_id = %s",
            "DELETE FROM payroll_payrollrun WHERE created_by_id = %s",
            "DELETE FROM analysis_analysisreport WHERE created_by_id = %s",
            "DELETE FROM jobs_job WHERE created_by_id = %s",
            "DELETE FROM crm_contact WHERE created_by_id = %s",
            "DELETE FROM transport_vehicle WHERE created_by_id = %s",
            
            # Other user references
            "DELETE FROM taxes_taxfiling WHERE user_id = %s",
            "DELETE FROM banking_bankaccount WHERE user_id = %s",
            "DELETE FROM payments_payment WHERE user_id = %s",
            "DELETE FROM whatsapp_business_whatsappmessage WHERE user_id = %s",
            "DELETE FROM data_export_exportrequest WHERE user_id = %s",
            "DELETE FROM communications_communication WHERE user_id = %s",
            
            # Finally, delete the user
            "DELETE FROM custom_auth_user WHERE id = %s"
        ]
        
        success = True
        with connection.cursor() as cursor:
            for query in deletion_queries:
                table_name = query.split('FROM ')[1].split(' WHERE')[0]
                try:
                    if not dry_run:
                        cursor.execute(query, [user_id])
                        rows_deleted = cursor.rowcount
                        if rows_deleted > 0:
                            logger.info(f"  ✅ Deleted {rows_deleted} rows from {table_name}")
                            self.deleted_tables.append(table_name)
                    else:
                        # In dry run, just check if table exists
                        cursor.execute(f"""
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_name = %s
                            )
                        """, [table_name])
                        if cursor.fetchone()[0]:
                            logger.info(f"  Would delete from {table_name}")
                except Exception as e:
                    # Table might not exist, which is fine
                    if "does not exist" not in str(e):
                        logger.warning(f"  ⚠️  Could not delete from {table_name}: {str(e)}")
                        self.error_tables.append(table_name)
        
        if not dry_run:
            # Verify deletion
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT COUNT(*) FROM custom_auth_user WHERE email = %s",
                    [email]
                )
                remaining = cursor.fetchone()[0]
                if remaining == 0:
                    logger.info(f"\n✅ SUCCESS: User {email} has been completely deleted")
                    success = True
                else:
                    logger.error(f"\n❌ FAILED: User {email} still exists in database")
                    success = False
        else:
            logger.info(f"\n✅ DRY RUN COMPLETE: User {email} would be deleted")
        
        return success
    
    def delete_user(self, email, confirm=True, dry_run=False):
        """Main method to delete a user"""
        logger.info("=" * 60)
        logger.info(f"USER DELETION PROCESS - {email}")
        logger.info("=" * 60)
        
        # Find user
        user = self.find_user(email)
        if not user:
            return False
        
        # Count related records
        logger.info("\n📊 Counting related records...")
        related_counts = self.count_related_records(user.id)
        
        # Confirm deletion
        if confirm and not dry_run:
            logger.info("\n⚠️  WARNING: This will permanently delete the user and ALL related data!")
            response = input(f"\nDo you want to DELETE user {email}? Type 'DELETE' to confirm: ")
            if response != 'DELETE':
                logger.info("❌ Deletion cancelled")
                return False
        
        # Perform deletion
        logger.info(f"\n{'🔍 Performing DRY RUN' if dry_run else '🗑️  Deleting user data'}...")
        
        with transaction.atomic():
            success = self.delete_user_data(user.id, email, dry_run)
            
            if dry_run:
                # Rollback in dry run mode
                transaction.set_rollback(True)
        
        # Print summary
        if self.deleted_tables:
            logger.info(f"\n📋 Tables cleaned: {', '.join(self.deleted_tables)}")
        if self.error_tables:
            logger.info(f"\n⚠️  Tables with errors: {', '.join(self.error_tables)}")
        
        return success


def main():
    """Main entry point for command-line usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Delete a user and all related data')
    parser.add_argument('email', help='Email address of the user to delete')
    parser.add_argument('--no-confirm', action='store_true', help='Skip confirmation prompt')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted without actually deleting')
    
    args = parser.parse_args()
    
    deleter = UserDeletion()
    success = deleter.delete_user(
        email=args.email,
        confirm=not args.no_confirm,
        dry_run=args.dry_run
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    # If no command-line arguments, run interactively
    if len(sys.argv) == 1:
        print("\n🗑️  USER DELETION TOOL")
        print("=" * 40)
        email = input("Enter email address to delete: ")
        
        if email:
            print("\nOptions:")
            print("1. Delete user (with confirmation)")
            print("2. Dry run (show what would be deleted)")
            print("3. Cancel")
            
            choice = input("\nSelect option (1-3): ")
            
            deleter = UserDeletion()
            
            if choice == '1':
                deleter.delete_user(email, confirm=True, dry_run=False)
            elif choice == '2':
                deleter.delete_user(email, confirm=False, dry_run=True)
            else:
                print("Cancelled")
    else:
        main()