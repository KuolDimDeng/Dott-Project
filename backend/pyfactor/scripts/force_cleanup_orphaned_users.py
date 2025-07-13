#!/usr/bin/env python3
"""
Force cleanup orphaned users using direct SQL to avoid cascade issues
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

from django.db import connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def force_cleanup_orphaned_users():
    """Force delete orphaned users using SQL"""
    
    with connection.cursor() as cursor:
        # Find orphaned users
        cursor.execute("""
            SELECT id, email, auth0_sub 
            FROM custom_auth_user 
            WHERE auth0_sub LIKE 'pending_%'
        """)
        
        orphaned_users = cursor.fetchall()
        
        if not orphaned_users:
            logger.info("No orphaned users found.")
            return
        
        logger.info(f"Found {len(orphaned_users)} orphaned users:")
        for user_id, email, auth0_sub in orphaned_users:
            logger.info(f"  - {email} (ID: {user_id}, auth0_sub: {auth0_sub})")
        
        # Ask for confirmation
        response = input("\nDo you want to delete these orphaned users? (yes/no): ")
        
        if response.lower() == 'yes':
            deleted_count = 0
            
            for user_id, email, auth0_sub in orphaned_users:
                try:
                    logger.info(f"Deleting user: {email} (ID: {user_id})")
                    
                    # Delete related records first (if they exist)
                    tables_to_clean = [
                        ('smart_insights_usercredit', 'user_id'),
                        ('smart_insights_creditusage', 'user_id'),
                        ('hr_employee', 'user_id'),
                        ('payroll_payrun', 'created_by_id'),
                        ('payroll_payrun', 'approved_by_id'),
                        ('invoices_invoice', 'created_by_id'),
                        ('api_notifications_notification', 'user_id'),
                        ('business_business', 'owner_id')
                    ]
                    
                    for table, column in tables_to_clean:
                        try:
                            cursor.execute(f"DELETE FROM {table} WHERE {column} = %s", [user_id])
                            if cursor.rowcount > 0:
                                logger.info(f"  Cleaned {cursor.rowcount} records from {table}")
                        except Exception as e:
                            # Silently skip tables that don't exist
                            pass
                    
                    # Delete the user record
                    cursor.execute("DELETE FROM custom_auth_user WHERE id = %s", [user_id])
                    deleted_count += 1
                    logger.info(f"Successfully deleted user: {email}")
                    
                except Exception as e:
                    logger.error(f"Error deleting user {email}: {str(e)}")
            
            logger.info(f"Deleted {deleted_count} orphaned users.")
        else:
            logger.info("No users deleted.")
    
    # Handle specific email if provided
    if len(sys.argv) > 1:
        email = sys.argv[1]
        logger.info(f"\nChecking specific email: {email}")
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, email, auth0_sub 
                FROM custom_auth_user 
                WHERE email = %s
            """, [email])
            
            result = cursor.fetchone()
            if result:
                user_id, user_email, auth0_sub = result
                logger.info(f"Found user: {user_email} (ID: {user_id}, auth0_sub: {auth0_sub})")
                
                if auth0_sub.startswith('pending_'):
                    response = input(f"\nThis user has not been synced with Auth0. Delete? (yes/no): ")
                    if response.lower() == 'yes':
                        try:
                            # Clean related records using the same list
                            tables_to_clean = [
                                ('smart_insights_usercredit', 'user_id'),
                                ('smart_insights_creditusage', 'user_id'),
                                ('hr_employee', 'user_id'),
                                ('payroll_payrun', 'created_by_id'),
                                ('payroll_payrun', 'approved_by_id'),
                                ('invoices_invoice', 'created_by_id'),
                                ('api_notifications_notification', 'user_id'),
                                ('business_business', 'owner_id')
                            ]
                            
                            for table, column in tables_to_clean:
                                try:
                                    cursor.execute(f"DELETE FROM {table} WHERE {column} = %s", [user_id])
                                    if cursor.rowcount > 0:
                                        logger.info(f"  Cleaned {cursor.rowcount} records from {table}")
                                except:
                                    pass
                            
                            # Delete the user
                            cursor.execute("DELETE FROM custom_auth_user WHERE id = %s", [user_id])
                            logger.info(f"Deleted user {email}")
                        except Exception as e:
                            logger.error(f"Error deleting user {email}: {str(e)}")
                else:
                    logger.info(f"User {email} has been synced with Auth0 (auth0_sub: {auth0_sub})")
            else:
                logger.info(f"User {email} not found in database")

if __name__ == "__main__":
    force_cleanup_orphaned_users()